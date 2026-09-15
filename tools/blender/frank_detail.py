"""Frank Mercer v2's modelled detail, so the cel pass has something to catch (item 2300): folds pressed
into the suit at the elbows, back, waist, knees and trouser breaks, the hair broken into locks with
pointed tips, ragged cuffs, hem and lapels, a splayed collar and a lower tie knot.

Geometry only, because the pixel program reads normals, ids and cel bands, never colour maps. The
suit and hair get one baked subdivision level first so the folds have vertices to live on. Material
slots, vertex groups and the game_engine rig are untouched, so spritesmith's frank_pose_buffers.py
poses the result unchanged.

Run headless only, once, on the blend frank_character_v2.py writes:
    blender --background <frank-mercer-v2.blend> --python tools/blender/frank_detail.py -- <out dir>
"""

import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector, noise

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import frank_character_v2 as v2  # noqa: E402

JACKET, SHIRT, TIE, TROUSERS = range(4)   # the suit mesh's slots, as split_suit orders them
EDGE_RINGS = 4
LOCKS = 13
FOLD = 1.9   # fold depth scale: at 44 px a metre, anything shallower vanishes in the 128 px buffers


def crease(x):
    """Rounded ridges with sharp valleys, one per unit of x: the ridges take a band, the valleys a line."""
    return abs(math.sin(math.pi * x)) - 0.6


def bake_subdivision(obj):
    mod = obj.modifiers.new("detail_bake", "SUBSURF")
    mod.levels = mod.render_levels = 1
    with bpy.context.temp_override(object=obj, active_object=obj, selected_objects=[obj]):
        bpy.ops.object.modifier_move_to_index(modifier=mod.name, index=0)
        bpy.ops.object.modifier_apply(modifier=mod.name)


def edge_rings(mesh):
    """Vertex index -> rings in from the nearest open edge (cuffs, hems, lapels, collar), up to EDGE_RINGS."""
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.verts.ensure_lookup_table()
    ring = {}
    front = {v.index for e in bm.edges if e.is_boundary for v in e.verts}
    for depth in range(EDGE_RINGS):
        for i in front:
            ring[i] = depth
        front = {e.other_vert(bm.verts[i]).index for i in front for e in bm.verts[i].link_edges} - ring.keys()
    bm.free()
    return ring


def world_normals(obj):
    rot = obj.matrix_world.to_3x3()
    return [(rot @ v.normal).normalized() for v in obj.data.vertices]


def vertex_slots(mesh):
    slots = [set() for _ in mesh.vertices]
    for poly in mesh.polygons:
        for vi in poly.vertices:
            slots[vi].add(poly.material_index)
    return slots


def along(p, head, axis):
    t = (p - head).dot(axis)
    return t, p - head - axis * t


def detail_suit(suit, bone):
    ring = edge_rings(suit.data)
    normals = world_normals(suit)
    slots = vertex_slots(suit.data)
    centre_y = bone("spine_03").y
    neck_z = bone("neck_01").z
    waist_z = bone("spine_01").z + 0.02
    shoulder_z = bone("clavicle_l").z
    hem_z = bone("thigh_l").z - 0.13
    arms = {s: (bone("lowerarm_" + s), (bone("lowerarm_" + s, tail=True) - bone("upperarm_" + s)).normalized())
            for s in "lr"}
    legs = {s: (bone("calf_" + s), (bone("calf_" + s, tail=True) - bone("thigh_" + s)).normalized(),
                bone("calf_" + s, tail=True)) for s in "lr"}
    tie_top = max((suit.matrix_world @ suit.data.vertices[i].co).z for i, sl in enumerate(slots) if TIE in sl)
    counts = {"edge vertices frayed": 0, "fold vertices": 0}

    def shape(i, p):
        sl, n = slots[i], normals[i]
        d = 0.0
        side = "l" if p.x > 0 else "r"
        elbow, arm = arms[side]
        t, r = along(p, elbow, arm)
        if r.length < 0.13 and abs(t) < 0.24:
            inner = 0.55 + 0.45 * max(0.0, -r.normalized().y)
            twist = 0.35 * math.atan2(r.z, r.x) / math.pi
            d += 0.013 * math.exp(-(t / 0.09) ** 2) * inner * crease(t / 0.05 + twist + 0.3 * noise.noise(p * 12))
            if JACKET in sl:
                d += 0.005 * crease(t / 0.08 + math.atan2(r.z, r.x) / math.pi)
        knee, leg, ankle = legs[side]
        t, r = along(p, knee, leg)
        if r.length < 0.14 and abs(t) < 0.2 and TROUSERS in sl:
            back = 0.45 + 0.55 * max(0.0, r.normalized().y)
            d += 0.012 * math.exp(-(t / 0.08) ** 2) * back * crease(t / 0.055 + 0.3 * noise.noise(p * 10))
        h = p.z - ankle.z
        if TROUSERS in sl and -0.03 < h < 0.22 and abs(p.x - ankle.x) < 0.14:
            d += 0.014 * max(0.0, 1 - h / 0.22) * crease(h / 0.045 + 0.25 * noise.noise(p * 9))
        if JACKET in sl and hem_z < p.z < shoulder_z:
            back = min(1.0, max(0.0, (p.y - centre_y) / 0.08))
            if back:
                blade = min(1.0, (shoulder_z - p.z) / 0.1) * min(1.0, (p.z - hem_z) / 0.1)
                d += 0.010 * back * blade * crease((abs(p.x) + 0.5 * (shoulder_z - p.z)) / 0.07
                                                   + 0.3 * noise.noise(p * 8))
                d += 0.009 * back * math.exp(-((p.z - waist_z) / 0.06) ** 2) * crease(
                    (p.z - waist_z) / 0.035 + 0.4 * noise.noise(p * 7))
            elif p.y < centre_y and abs(p.x) < 0.25 and p.z < waist_z + 0.15:
                dx, dz = abs(p.x) + 1e-3, p.z - waist_z
                dist = math.hypot(dx, dz)
                d += 0.008 * math.exp(-(dist / 0.18) ** 2) * min(1.0, dist / 0.04) * crease(math.atan2(dz, dx) / 0.35)
        if d:
            counts["fold vertices"] += 1
        q = p + n * max(-0.04, min(0.045, FOLD * d))
        if i in ring:
            w = 1.0 - ring[i] / EDGE_RINGS
            counts["edge vertices frayed"] += 1
            if p.z > neck_z - 0.18:
                out = Vector((p.x, p.y - centre_y, 0.0))
                q += out.normalized() * 0.014 * w + Vector((0, 0, -0.008 * w)) if out.length else Vector()
                q += n * 0.004 * w * noise.noise(p * 40)
            elif TROUSERS in sl and p.z < legs[side][2].z + 0.1:
                q += n * w * (0.004 + 0.006 * noise.noise(p * 50))
            else:
                q += n * w * (0.006 + 0.010 * noise.noise(p * 55 + Vector((2.3, 0.0, 0.0))))
                q.z -= w * 0.012 * max(0.0, noise.noise(p * 18))
        if TIE in sl and not sl - {TIE}:
            knot = max(0.0, 1.0 - (tie_top - p.z) / 0.12)
            q += Vector((0.006 * knot, -0.004 * knot, -0.03 * knot))
        return q

    v2.move_vertices(suit, shape)
    return counts


def detail_hair(hair, head_centre):
    ring = edge_rings(hair.data)
    crown = head_centre + Vector((0.0, 0.02, 0.10))

    def shape(i, p):
        v = p - crown
        rho = math.acos(max(-1.0, min(1.0, v.normalized().z)))
        phi = math.atan2(v.x, -v.y)
        u = phi * LOCKS / (2 * math.pi) + 0.6 * rho + 0.35 * noise.noise(p * 9)
        lock = abs(math.sin(math.pi * u))
        out = (p - head_centre).normalized()
        q = p + out * 0.022 * (lock - 0.45) * min(1.0, rho / 0.5)
        tip = max(0.0, min(1.0, (rho - 1.0) / 0.6))
        if i in ring:
            tip = max(tip, 1.0 - ring[i] / EDGE_RINGS)
        q += (v.normalized() * 0.6 + out * 0.4) * 0.028 * tip * (lock ** 3 - 0.3)
        return q

    v2.move_vertices(hair, shape)
    return {"locks": LOCKS, "edge vertices pointed": len(ring)}


def main(out_dir):
    scene = bpy.context.scene
    if scene.get("frank_detail"):
        raise SystemExit("this blend already has item 2300's detail; run on frank_character_v2.py's output")
    rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    world = rig.matrix_world

    def bone(name, tail=False):
        b = rig.data.bones[name]
        return world @ (b.tail_local if tail else b.head_local)

    suit = next(o for o in bpy.data.objects if o.name.endswith("male_elegantsuit01"))
    hair = next(o for o in bpy.data.objects if o.name.endswith("short02"))
    report = {}
    for obj in (suit, hair):
        before = len(obj.data.vertices)
        bake_subdivision(obj)
        report[obj.name] = {"vertices before": before, "vertices after": len(obj.data.vertices)}
    report[suit.name].update(detail_suit(suit, bone))
    head = rig.data.bones["head"]
    report[hair.name].update(detail_hair(hair, world @ (head.head_local + (head.tail_local - head.head_local) * 0.45)))
    scene["frank_detail"] = 2300
    v2.render_views(out_dir)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out_dir, "frank-mercer-v2.blend"), compress=True)
    meta_path = os.path.join(out_dir, "frank-mercer-v2.json")
    meta = json.load(open(meta_path, encoding="utf-8")) if os.path.exists(meta_path) else {}
    meta["detail"] = report
    with open(meta_path, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(meta, fh, indent=2)
    print("DETAIL " + json.dumps(report))


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    out = os.path.abspath(argv[0] if argv else "out/frank-mercer-v2")
    os.makedirs(out, exist_ok=True)
    main(out)
