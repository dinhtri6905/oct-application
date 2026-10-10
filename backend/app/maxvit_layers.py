"""Exact custom layer definitions from model/maxvit_oct.ipynb, cell 14.

Keep these definitions aligned with the notebook used to save maxvit_oct.keras.
"""
import tensorflow as tf
import keras
from keras import layers

# ======================================================
# CÁC BLOCK KIẾN TRÚC MAXVIT
# ======================================================

# ======================================================
# BLOCK 1: SqueezeExcite – hiệu chỉnh trọng số kênh
# ======================================================

class SqueezeExcite(layers.Layer):
    """Squeeze-and-Excitation block: hiệu chỉnh trọng số kênh theo ngữ cảnh toàn cục.

    Parameters
    ----------
    in_channels : int   – số kênh đầu vào
    se_ratio    : float – tỷ lệ nén kênh (mặc định 0.25 → giảm 4 lần)
    """
    def __init__(self, in_channels, se_ratio=0.25, **kw):
        super().__init__(**kw)
        hidden = max(8, int(in_channels * se_ratio))
        self.pool   = layers.GlobalAveragePooling2D(keepdims=True)
        self.reduce = layers.Conv2D(hidden,       1, activation='swish', padding='same')
        self.expand = layers.Conv2D(in_channels,  1, activation='sigmoid', padding='same')

    def call(self, x):
        """Tính trọng số kênh rồi nhân element-wise với input."""
        s = self.expand(self.reduce(self.pool(x)))
        return x * s


# ======================================================
# BLOCK 2: StochasticDepth – Drop Path / Stochastic Depth
# ======================================================

class StochasticDepth(layers.Layer):
    """Drop-path / Stochastic Depth – triển khai an toàn cho Keras 3.

    Dùng tf.random.uniform thay vì keras.random.uniform để tránh lỗi
    'tf.function only supports singleton tf.Variables' trong Keras 3.

    Trong quá trình huấn luyện: ngẫu nhiên bỏ toàn bộ residual branch
    của một sample với xác suất drop_rate.
    Trong quá trình inference: trả về nguyên bản input.
    """
    def __init__(self, drop_rate=0.0, **kw):
        super().__init__(**kw)
        self.drop_rate = float(drop_rate)

    def call(self, x, training=None):
        """Áp dụng stochastic depth khi training=True."""
        if not training or self.drop_rate == 0.0:
            return x
        keep_prob = 1.0 - self.drop_rate
        batch_size = tf.shape(x)[0]
        # Mask shape (batch, 1, 1, ...) để broadcast trên toàn spatial
        noise_shape = tf.concat(
            [[batch_size], tf.ones([tf.rank(x) - 1], dtype=tf.int32)], axis=0
        )
        random_mask = tf.floor(keep_prob + tf.random.uniform(noise_shape, dtype=x.dtype))
        return tf.math.divide(x, keep_prob) * random_mask


# ======================================================
# BLOCK 3: MBConvBlock – Mobile Inverted Bottleneck + SE
# ======================================================

class MBConvBlock(layers.Layer):
    """Mobile Inverted Bottleneck Conv (MBConv) với Squeeze-Excite và Stochastic Depth.

    Được dùng làm backbone cục bộ trong mỗi MaxViT Block.

    Parameters
    ----------
    out_ch    : int   – số kênh đầu ra
    expansion : int   – hệ số mở rộng kênh trong bottleneck (mặc định 4)
    stride    : int   – bước trượt của depthwise conv (1 hoặc 2)
    se_ratio  : float – tỷ lệ nén kênh cho SE block
    drop_rate : float – tỷ lệ drop path
    """
    def __init__(self, out_ch, expansion=4, stride=1, se_ratio=0.25, drop_rate=0.0, **kw):
        super().__init__(**kw)
        self.out_ch    = out_ch
        self.expansion = expansion
        self.stride    = stride
        self.drop      = StochasticDepth(drop_rate)
        # Pooling shortcut khi stride=2 để khớp spatial resolution
        self.pool_sc = layers.MaxPool2D(2, 2, padding='same') if stride == 2 else None

    def build(self, input_shape):
        """Khởi tạo các sub-layer sau khi biết input shape."""
        inc  = int(input_shape[-1])
        expc = inc * self.expansion

        # Lớp mở rộng kênh (expand phase) – bỏ qua nếu expansion=1
        if self.expansion != 1:
            self.exp_conv = layers.Conv2D(expc, 1, padding='same', use_bias=False)
            self.exp_bn   = layers.BatchNormalization()
            self.exp_act  = layers.Activation('swish')
        else:
            expc = inc

        # Depthwise conv → SE → projection
        self.dw_conv = layers.DepthwiseConv2D(3, strides=self.stride, padding='same', use_bias=False)
        self.dw_bn   = layers.BatchNormalization()
        self.dw_act  = layers.Activation('swish')
        self.se      = SqueezeExcite(expc)
        self.proj    = layers.Conv2D(self.out_ch, 1, padding='same', use_bias=False)
        self.proj_bn = layers.BatchNormalization()

        # Shortcut projection: dùng khi kích thước kênh hoặc spatial thay đổi
        self.sc_proj = None
        self.sc_bn   = None
        if self.stride != 1 or inc != self.out_ch:
            self.sc_proj = layers.Conv2D(self.out_ch, 1, padding='same', use_bias=False)
            self.sc_bn   = layers.BatchNormalization()
        super().build(input_shape)

    def call(self, x, training=None):
        """Forward pass: expand → depthwise → SE → project → residual."""
        shortcut = x

        # Expand phase (nếu có)
        if hasattr(self, 'exp_conv'):
            x = self.exp_act(self.exp_bn(self.exp_conv(x), training=training))

        # Depthwise → SE → Projection
        x = self.dw_act(self.dw_bn(self.dw_conv(x), training=training))
        x = self.se(x)
        x = self.proj_bn(self.proj(x), training=training)

        # Điều chỉnh shortcut nếu cần
        if self.pool_sc is not None:
            shortcut = self.pool_sc(shortcut)
        if self.sc_proj is not None:
            shortcut = self.sc_bn(self.sc_proj(shortcut), training=training)

        # Residual connection + stochastic depth
        return shortcut + self.drop(x, training=training)


# ======================================================
# BLOCK 4: MaxViTAttentionBlock – Window + Grid Attention
# ======================================================
# Triển khai Multi-Axis Self-Attention theo MaxViT paper (Tu et al. 2022).
# Gồm 2 sub-block tuần tự:
#   (a) Local Window MHSA  – attention trong các cửa sổ P×P
#   (b) Dilated Grid MHSA  – attention giữa các token cùng vị trí trong lưới P×P
# Mỗi sub-block: pre-norm (LayerNorm) → MHSA → residual + stochastic depth
#                → pre-norm → FFN (Dense-GELU-Dense) → residual + stochastic depth

class MaxViTAttentionBlock(layers.Layer):
    """Window Self-Attention và Grid Self-Attention kết hợp cho MaxViT.

    Parameters
    ----------
    dim         : int   – số chiều kênh (phải khớp với input channel dim)
    num_heads   : int   – số attention heads
    window_size : int   – kích thước cửa sổ P (mặc định 7)
    mlp_ratio   : int   – hệ số mở rộng trong FFN (mặc định 4)
    drop_rate   : float – tỷ lệ stochastic depth
    attn_drop   : float – tỷ lệ dropout bên trong attention và FFN
    """
    def __init__(self, dim, num_heads, window_size=7, mlp_ratio=4,
                 drop_rate=0.0, attn_drop=0.0, **kw):
        super().__init__(**kw)
        self.dim         = dim
        self.window_size = window_size
        key_dim          = max(1, dim // num_heads)

        # (a) Window attention sub-block
        self.norm_w     = layers.LayerNormalization(epsilon=1e-5)
        self.window_attn = layers.MultiHeadAttention(
            num_heads=num_heads, key_dim=key_dim, dropout=attn_drop)
        self.dp_w       = StochasticDepth(drop_rate)
        self.norm_w_ffn = layers.LayerNormalization(epsilon=1e-5)
        self.ffn_w      = keras.Sequential([
            layers.Dense(dim * mlp_ratio, activation='gelu'),
            layers.Dropout(attn_drop),
            layers.Dense(dim),
        ], name='ffn_window')
        self.dp_w_ffn   = StochasticDepth(drop_rate)

        # (b) Grid attention sub-block
        self.norm_g     = layers.LayerNormalization(epsilon=1e-5)
        self.grid_attn  = layers.MultiHeadAttention(
            num_heads=num_heads, key_dim=key_dim, dropout=attn_drop)
        self.dp_g       = StochasticDepth(drop_rate)
        self.norm_g_ffn = layers.LayerNormalization(epsilon=1e-5)
        self.ffn_g      = keras.Sequential([
            layers.Dense(dim * mlp_ratio, activation='gelu'),
            layers.Dropout(attn_drop),
            layers.Dense(dim),
        ], name='ffn_grid')
        self.dp_g_ffn   = StochasticDepth(drop_rate)

    def build(self, input_shape):
        """Xác nhận channel dim khớp với self.dim."""
        c = int(input_shape[-1])
        assert c == self.dim, (
            f'MaxViTAttentionBlock: expected dim={self.dim}, got channel={c}')
        super().build(input_shape)

    def call(self, x, training=None):
        """Forward pass: Window Attention → Grid Attention.

        Input/Output shape: (B, H, W, C)  – C phải bằng self.dim
        Yêu cầu: H và W đều chia hết cho window_size (P).
        """
        B  = tf.shape(x)[0]   # batch size (dynamic)
        H  = tf.shape(x)[1]   # height (dynamic)
        W  = tf.shape(x)[2]   # width  (dynamic)
        P  = self.window_size  # Python int (static)
        C  = self.dim          # Python int (static)
        nH = H // P            # số cửa sổ theo H (dynamic tensor)
        nW = W // P            # số cửa sổ theo W (dynamic tensor)

        # =======================================================
        # (a) LOCAL WINDOW SELF-ATTENTION
        # =======================================================
        # Partition feature map thành các cửa sổ không chồng lấp kích thước P×P:
        #   (B, H, W, C)
        #   → reshape  : (B, nH, P, nW, P, C)
        #   → transpose: (B, nH, nW, P, P, C)   [gom H và W theo window]
        #   → reshape  : (B*nH*nW, P*P, C)       [flatten windows vào batch]
        xw = tf.reshape(x, [B, nH, P, nW, P, C])
        xw = tf.transpose(xw, [0, 1, 3, 2, 4, 5])     # (B, nH, nW, P, P, C)
        xw = tf.reshape(xw, [B * nH * nW, P * P, C])  # (B*nH*nW, P*P, C)

        # Window MHSA: pre-norm → attention → residual + drop path
        xw_normed  = self.norm_w(xw)
        attn_out   = self.window_attn(xw_normed, xw_normed, training=training)
        xw         = xw + self.dp_w(attn_out, training=training)
        # Window FFN:  pre-norm → FFN → residual + drop path
        xw         = xw + self.dp_w_ffn(
            self.ffn_w(self.norm_w_ffn(xw), training=training), training=training)

        # Unpartition: (B*nH*nW, P*P, C) → (B, H, W, C)
        #   → reshape  : (B, nH, nW, P, P, C)
        #   → transpose: (B, nH, P, nW, P, C)
        #   → reshape  : (B, H, W, C)
        xw = tf.reshape(xw, [B, nH, nW, P, P, C])
        xw = tf.transpose(xw, [0, 1, 3, 2, 4, 5])  # (B, nH, P, nW, P, C)
        x  = tf.reshape(xw, [B, H, W, C])

        # =======================================================
        # (b) DILATED GRID SELF-ATTENTION
        # =======================================================
        # Partition feature map theo lưới dilated P×P:
        #   (B, H, W, C)
        #   → reshape  : (B, nH, P, nW, P, C)
        #   → transpose: (B, P, P, nH, nW, C)   [gom theo bước nhảy, không theo cửa sổ]
        #   → reshape  : (B*P*P, nH*nW, C)       [mỗi grid cell = nH*nW tokens trải đều]
        # Ý nghĩa: mỗi trong P*P grid cells tập hợp các token cùng vị trí tương đối
        # trong tất cả các cửa sổ → attention qua toàn bộ feature map (global context)
        xg = tf.reshape(x, [B, nH, P, nW, P, C])
        xg = tf.transpose(xg, [0, 2, 4, 1, 3, 5])     # (B, P, P, nH, nW, C)
        xg = tf.reshape(xg, [B * P * P, nH * nW, C])  # (B*P*P, nH*nW, C)

        # Grid MHSA: pre-norm → attention → residual + drop path
        xg_normed = self.norm_g(xg)
        attn_out  = self.grid_attn(xg_normed, xg_normed, training=training)
        xg        = xg + self.dp_g(attn_out, training=training)
        # Grid FFN:  pre-norm → FFN → residual + drop path
        xg        = xg + self.dp_g_ffn(
            self.ffn_g(self.norm_g_ffn(xg), training=training), training=training)

        # Unpartition: (B*P*P, nH*nW, C) → (B, H, W, C)
        #   → reshape  : (B, P, P, nH, nW, C)
        #   → transpose: (B, nH, P, nW, P, C)
        #   → reshape  : (B, H, W, C)
        xg = tf.reshape(xg, [B, P, P, nH, nW, C])
        xg = tf.transpose(xg, [0, 3, 1, 4, 2, 5])  # (B, nH, P, nW, P, C)
        x  = tf.reshape(xg, [B, H, W, C])

        return x


# ======================================================
# BLOCK 5: MaxViTBlock – MBConv + Window Attention + Grid Attention
# ======================================================

class MaxViTBlock(layers.Layer):
    """MaxViT Block: MBConv → Window Self-Attention → Grid Self-Attention.

    Kết hợp convolution cục bộ (MBConv) với attention đa trục (Multi-Axis):
    - MBConv           : học đặc trưng cục bộ; stride=2 khi là block đầu tiên của stage
    - Window Attention : học ngữ cảnh trong cửa sổ P×P (cục bộ)
    - Grid Attention   : học ngữ cảnh toàn cục qua lưới dilated P×P

    Parameters
    ----------
    dim         : int   – số kênh đầu ra
    num_heads   : int   – số attention heads
    window_size : int   – kích thước cửa sổ P
    expansion   : int   – hệ số mở rộng kênh trong MBConv (mặc định 4)
    se_ratio    : float – tỷ lệ nén SE
    mlp_ratio   : int   – hệ số mở rộng trong FFN attention
    stride      : int   – stride cho MBConv (1 hoặc 2; 2 = downsampling)
    drop_rate   : float – tỷ lệ stochastic depth
    attn_drop   : float – tỷ lệ dropout trong attention và FFN
    """
    def __init__(self, dim, num_heads, window_size=7, expansion=4, se_ratio=0.25,
                 mlp_ratio=4, stride=1, drop_rate=0.0, attn_drop=0.0, **kw):
        super().__init__(**kw)
        # MBConv: xử lý downsampling (nếu stride=2) và học đặc trưng cục bộ
        self.mbconv = MBConvBlock(
            dim, expansion=expansion, stride=stride,
            se_ratio=se_ratio, drop_rate=drop_rate)
        # MaxViT Attention: window + grid attention trên feature map sau MBConv
        self.attn_block = MaxViTAttentionBlock(
            dim, num_heads, window_size=window_size,
            mlp_ratio=mlp_ratio, drop_rate=drop_rate, attn_drop=attn_drop)

    def call(self, x, training=None):
        """Forward pass: MBConv → Window Attention → Grid Attention."""
        # MBConv: (B, H_in, W_in, C_in) → (B, H_in//stride, W_in//stride, dim)
        x = self.mbconv(x, training=training)
        # Window + Grid attention: giữ nguyên shape (B, H_out, W_out, dim)
        x = self.attn_block(x, training=training)
        return x


# ======================================================
# HÀM XÂY DỰNG MÔ HÌNH MAXVIT
# ======================================================

