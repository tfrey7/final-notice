import bpy, sys, os, math
import numpy as np
from mathutils import Vector, kdtree
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index("--") + 1:]
GLB, SHEET, OUT = argv[0], argv[1], argv[2]
TAKES = argv[3].split(",") if len(argv) > 3 else ["project", "cel"]
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
for o in bpy.context.scene.objects:
    o.select_set(o.type == "MESH")
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
obj = bpy.context.view_layer.objects.active
bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me = obj.data
nv = len(me.vertices)
co = np.empty(nv * 3, np.float32); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
me.calc_normals_split() if hasattr(me, "calc_normals_split") else None
nrm = np.empty(nv * 3, np.float32); me.vertices.foreach_get("normal", nrm); nrm = nrm.reshape(-1, 3)
print("verts", nv, "bbox", co.min(0), co.max(0))

# --- sheet: front figure crop and mask (top-down rows) ---
img = bpy.data.images.load(SHEET)
W, H = img.size
px = np.array(img.pixels[:], np.float32).reshape(H, W, 4)[::-1, :, :3] * 255.0
X0, X1, Y0, Y1 = 30, 410, 62, 858
crop = px[Y0:Y1, X0:X1]
r, g, b = crop[..., 0], crop[..., 1], crop[..., 2]
lum = 0.299 * r + 0.587 * g + 0.114 * b
chroma = crop.max(-1) - crop.min(-1)
wall = (chroma < 16) & (b <= r + 6) & (lum > 12) & (lum < 105)
floor = (chroma < 32) & (b <= r) & (lum > 60) & (lum < 130)
bg = wall | floor
fig = ~bg
# measured on the sheet: hair top y 62, shoe soles y 836, figure centre x 220
fy0, fy1, fx0, fx1 = 0, 774, 190 - 190, 190 + 190
print("figure bbox in crop", fx0, fx1, fy0, fy1)

zmin, zmax = co[:, 2].min(), co[:, 2].max()
xmid = (co[:, 0].min() + co[:, 0].max()) / 2
s = (fy1 - fy0) / (zmax - zmin)
imx = (fx0 + fx1) / 2 + (co[:, 0] - xmid) * s
imy = fy0 + (zmax - co[:, 2]) * s
ix = np.clip(np.round(imx).astype(int), 0, crop.shape[1] - 1)
iy = np.clip(np.round(imy).astype(int), 0, crop.shape[0] - 1)
proj = crop[iy, ix]
on_fig = fig[iy, ix]

# visibility from the front camera (looking +Y from -Y)
deps = bpy.context.evaluated_depsgraph_get()
bvh = BVHTree.FromObject(obj, deps)
visible = np.zeros(nv, bool)
d = Vector((0, -1, 0))
for i in range(nv):
    if nrm[i, 1] > -0.25 or not on_fig[i]:
        continue
    p = Vector(co[i]) + d * 0.004
    hit = bvh.ray_cast(p, d, 10.0)
    visible[i] = hit[0] is None
print("visible", visible.sum(), "of", nv)

kd = kdtree.KDTree(int(visible.sum()))
vis_idx = np.where(visible)[0]
for j, i in enumerate(vis_idx):
    kd.insert(Vector(co[i]), j)
kd.balance()
col_proj = proj.copy()
for i in np.where(~visible)[0]:
    _, j, _ = kd.find(Vector(co[i]))
    col_proj[i] = proj[vis_idx[j]]
hair_rgb = px[935:960, 730:770].reshape(-1, 3).mean(0)
back_head = ~visible & (co[:, 2] > zmax - 0.115 * (zmax - zmin)) & (nrm[:, 1] > -0.1)
col_proj[back_head] = hair_rgb

# --- palette regions ---
def swatch(cx, cy):
    return px[cy - 18:cy + 18, cx - 18:cx + 18].reshape(-1, 3).mean(0)
pal = {
    "suit": swatch(218, 948), "shirt": swatch(351, 948), "tie": swatch(483, 948),
    "hair": swatch(750, 948), "skin": swatch(885, 948), "shoes": np.array([22, 22, 26.0]),
}
print({k: v.round() for k, v in pal.items()})
protos = [  # (region, rgb): the swatches plus the shade each region wears on the sheet
    ("suit", pal["suit"]), ("suit", swatch(615, 948)), ("suit", pal["suit"] * 0.7),
    ("shirt", pal["shirt"]), ("shirt", pal["shirt"] * 0.72),
    ("tie", pal["tie"]), ("tie", pal["tie"] * 0.7),
    ("hair", pal["hair"]), ("hair", pal["hair"] * 1.35),
    ("skin", pal["skin"]), ("skin", pal["skin"] * np.array([0.8, 0.68, 0.6])),
    ("shoes", pal["shoes"]),
]
names = ["suit", "shirt", "tie", "hair", "skin", "shoes"]
P = np.array([p[1] for p in protos]); PL = np.array([names.index(p[0]) for p in protos])
dist = ((col_proj[:, None, :] - P[None]) ** 2).sum(-1)
lab = PL[dist.argmin(1)]
ne = len(me.edges)
ev = np.empty(ne * 2, np.int64); me.edges.foreach_get("vertices", ev); ev = ev.reshape(-1, 2)
for _ in range(6):
    votes = np.zeros((nv, len(names)))
    votes[np.arange(nv), lab] += 1.5
    np.add.at(votes, (ev[:, 0], lab[ev[:, 1]]), 1)
    np.add.at(votes, (ev[:, 1], lab[ev[:, 0]]), 1)
    lab = votes.argmax(1)
foot = co[:, 2] < zmin + 0.075 * (zmax - zmin)
lab[~foot & (lab == names.index("shoes"))] = names.index("suit")
lab[foot & (lab == names.index("suit")) & (col_proj.mean(1) < 45)] = names.index("shoes")
col_cel = np.array([pal[n] for n in names])[lab]
print("region counts", {n: int((lab == k).sum()) for k, n in enumerate(names)})

# --- material, lights, cameras ---
def set_colours(rgb):
    name = "Col"
    if name in me.color_attributes:
        me.color_attributes.remove(me.color_attributes[name])
    ca = me.color_attributes.new(name, "BYTE_COLOR", "POINT")
    rgba = np.concatenate([np.clip(rgb / 255.0, 0, 1), np.ones((nv, 1))], 1).astype(np.float32)
    ca.data.foreach_set("color_srgb", rgba.ravel())
    me.color_attributes.active_color = ca

mat = bpy.data.materials.new("frank"); mat.use_nodes = True
nt = mat.node_tree
bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
attr = nt.nodes.new("ShaderNodeVertexColor"); attr.layer_name = "Col"
nt.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
bsdf.inputs["Roughness"].default_value = 0.8
me.materials.clear(); me.materials.append(mat)

sc = bpy.context.scene
try:
    sc.render.engine = "BLENDER_EEVEE"
except TypeError:
    sc.render.engine = "BLENDER_EEVEE_NEXT"
sc.view_settings.view_transform = "Standard"
sc.render.resolution_x, sc.render.resolution_y = 520, 780
sc.render.film_transparent = False
world = bpy.data.worlds.new("w"); sc.world = world; world.use_nodes = True
bg_node = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
bg_node.inputs[0].default_value = (0.02, 0.02, 0.022, 1); bg_node.inputs[1].default_value = 1.0
for rot, energy in (((50, 0, -30), 3.2), ((60, 0, 150), 1.2)):
    ld = bpy.data.lights.new("sun", "SUN"); ld.energy = energy
    lo = bpy.data.objects.new("sun", ld); lo.rotation_euler = [math.radians(a) for a in rot]
    sc.collection.objects.link(lo)
camd = bpy.data.cameras.new("cam"); camd.type = "ORTHO"; camd.ortho_scale = 2.3
cam = bpy.data.objects.new("cam", camd); sc.collection.objects.link(cam); sc.camera = cam
zc = (zmin + zmax) / 2

for take in TAKES:
    set_colours(col_proj if take == "project" else col_cel)
    for view, yaw in (("front", 0), ("three-quarter", 45), ("side", 90)):
        a = math.radians(yaw)
        cam.location = (6 * math.sin(a), -6 * math.cos(a), zc)
        cam.rotation_euler = (math.radians(90), 0, a)
        sc.render.filepath = os.path.join(OUT, f"{take}-{view}.png")
        bpy.ops.render.render(write_still=True)
    if len(argv) > 4:
        bpy.ops.export_scene.gltf(filepath=os.path.join(argv[4], f"frank-a-{take}.glb"),
                                  export_format="GLB", use_selection=False,
                                  export_draco_mesh_compression_enable=True,
                                  export_draco_mesh_compression_level=6)
print("done")
