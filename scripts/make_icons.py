# Generates the launcher-icon SOURCE files for @capacitor/assets (custom mode) + the Play Store icon.
# Why this exists: the original icon source was lost; this reproduces the tube-note logo (ported from
# viz.js drawTubeNote), centered with even margins (the "centered_bigger" framing), and emits:
#   assets/icon-background.png  (1024, full-bleed dark gradient + glow)  -> adaptive background layer
#   assets/icon-foreground.png  (1024, transparent, logo within the adaptive safe zone)
#   assets/icon-only.png        (1024, flattened bg+logo)                -> legacy / round / Play
#   store-assets/icon-512.png   (512, = icon-only downscaled)            -> Play listing
# Then run:  npm run assets   (capacitor-assets generate --android)  to regenerate all densities.
from PIL import Image, ImageDraw, ImageFilter
import os
HERE=os.path.dirname(__file__)
ASSETS=os.path.join(HERE,"..","assets"); STORE=os.path.join(HERE,"..","store-assets")
os.makedirs(ASSETS,exist_ok=True); os.makedirs(STORE,exist_ok=True)

LOGO_BUB=[[509,185,6],[515,216,13],[528,260,23],[513,311,16],[538,338,10],[523,375,23],[507,417,11],[538,414,9],[566,280,8],[562,313,16],[595,304,5],[603,345,19],[635,357,4],[629,385,15],[628,419,5],[651,413,9],[648,444,12],[644,474,10],[628,495,6],[611,519,4]]
LOGO_BHL=[[521,252,7,0.9],[516,367,7,0.85],[597,339,6,0.8],[624,380,5,0.75],[644,440,4,0.7],[557,308,5,0.75]]

def rr(dr,x,y,w,h,r,fill): dr.rounded_rectangle([x,y,x+w,y+h],radius=max(1,r),fill=fill)

def draw_logo(size,cx,cy,k):
    lay=Image.new("RGBA",(size,size),(0,0,0,0)); d=ImageDraw.Draw(lay)
    S=k*0.033
    X=lambda lx:cx+(lx-500)*S; Y=lambda ly:cy+(ly-451)*S; R=lambda r:r*S
    def circ(x,y,r,col): d.ellipse([X(x)-R(r),Y(y)-R(r),X(x)+R(r),Y(y)+R(r)],fill=col)
    for x,y,r in LOGO_BUB: circ(x,y,r,(143,111,255,255))
    for x,y,r,a in LOGO_BHL:
        ov=Image.new("RGBA",(size,size),(0,0,0,0)); od=ImageDraw.Draw(ov)
        od.ellipse([X(x)-R(r),Y(y)-R(r),X(x)+R(r),Y(y)+R(r)],fill=(228,220,255,int(255*a))); lay.alpha_composite(ov)
    rr(d,X(489),Y(482),R(54),R(186),R(12),(109,74,255,255))
    rr(d,X(492),Y(512),R(48),R(148),R(12),(124,92,255,255))
    ov=Image.new("RGBA",(size,size),(0,0,0,0)); od=ImageDraw.Draw(ov)
    rr(od,X(495),Y(492),R(8),R(160),R(4),(217,208,255,int(255*0.55))); lay.alpha_composite(ov)
    rr(d,X(480),Y(466),R(72),R(24),R(11),(124,92,255,255))
    rr(d,X(480),Y(466),R(72),R(11),R(5),(167,139,250,255))
    rx,ry=R(88),R(62); pad=int(rx*2.6)
    nh=Image.new("RGBA",(pad,pad),(0,0,0,0)); nd=ImageDraw.Draw(nh); c0=pad/2
    nd.ellipse([c0-rx,c0-ry,c0+rx,c0+ry],fill=(109,74,255,255))
    hr_x,hr_y=R(30),R(16); hx,hy=c0+R(-32),c0+R(-24)
    ov2=Image.new("RGBA",(pad,pad),(0,0,0,0)); o2=ImageDraw.Draw(ov2)
    o2.ellipse([hx-hr_x,hy-hr_y,hx+hr_x,hy+hr_y],fill=(202,189,255,int(255*0.75))); nh.alpha_composite(ov2)
    nh=nh.rotate(16,resample=Image.BICUBIC,expand=True)
    px,py=X(456)-nh.width/2, Y(661)-nh.height/2
    lay.alpha_composite(nh,(int(px),int(py)))
    return lay

def vgrad(w,h,top,bot):
    img=Image.new("RGB",(w,h),bot); d=ImageDraw.Draw(img)
    for y in range(h):
        t=y/max(1,h-1); col=tuple(int(top[i]+(bot[i]-top[i])*t) for i in range(3)); d.line([(0,y),(w,y)],fill=col)
    return img
def glow(wh,cx,cy,rad,col,a):
    w,h=wh; ov=Image.new("RGBA",(w,h),(0,0,0,0)); d=ImageDraw.Draw(ov)
    d.ellipse([cx-rad,cy-rad,cx+rad,cy+rad],fill=col+(a,)); return ov.filter(ImageFilter.GaussianBlur(rad*0.5))

def logo_cropped():
    B=1600; full=draw_logo(B,B*0.5,B*0.5,44); return full.crop(full.getbbox())

def placed_logo(size, height_frac, ybias=0.0, wcap=0.72):
    """Transparent `size` layer with the cropped logo centered, scaled to height_frac (capped by wcap)."""
    lay=Image.new("RGBA",(size,size),(0,0,0,0))
    logo=logo_cropped(); scale=(size*height_frac)/logo.height
    if logo.width*scale>size*wcap: scale=size*wcap/logo.width
    lw,lh=int(logo.width*scale),int(logo.height*scale)
    logo=logo.resize((lw,lh),Image.LANCZOS)
    lay.alpha_composite(logo,(size//2-lw//2, int(size*(0.5+ybias))-lh//2))
    return lay

def background(size):
    bg=vgrad(size,size,(30,50,78),(11,13,26)).convert("RGBA")
    bg.alpha_composite(glow((size,size),size//2,int(size*0.46),int(size*0.34),(124,92,255),120))
    return bg

S=1024
# --- adaptive background (full bleed) ---
background(S).convert("RGB").save(os.path.join(ASSETS,"icon-background.png"))
# --- adaptive foreground (logo only). capacitor-assets insets this layer 16.7%, so the SOURCE maps to the
# 72dp safe zone — the logo must fill most of the source (~0.88) to land at the "bigger" size after inset. ---
placed_logo(S, height_frac=0.88, ybias=-0.02, wcap=0.66).save(os.path.join(ASSETS,"icon-foreground.png"))
# --- flattened icon (legacy / round / store): a touch bigger since there's no extra mask inset here ---
flat=background(S); flat.alpha_composite(placed_logo(S, height_frac=0.62, ybias=-0.02, wcap=0.72))
flat.convert("RGB").save(os.path.join(ASSETS,"icon-only.png"))
flat.resize((512,512),Image.LANCZOS).convert("RGB").save(os.path.join(STORE,"icon-512.png"))
print("wrote assets/icon-background.png, icon-foreground.png, icon-only.png and store-assets/icon-512.png")
