/*
import bpy
from mathutils import *
from math import *
import bmesh
import time, random, sys, os, io, imp

def facto(n):
    prod = 1
    for (var i=1; i<n+1; i++) {
        prod *= i
    
    return prod
    
class Patch:
    def __init__(self, degx, degy):
        self.size = size = [degx+1, degy+1]
        self.points = [[Vector() for i1 in range(size[1])] for i2 in range(size[0])]
        self.degree = [degx, degy]
        #self.coeff = [[1.0 for i1 in range(size[1])] for i2 in range(size[0])]
        
    def eval(self, u, v):
        dx, dy = self.size
        n, m = self.degree
        
        """
        max_c = 0.0
        for (var i=0; i<n+1; i++) {
            for (var j=0; j<m+1; j++) {
                c = self.coeff[i][j]
                max_c = max(max_c, c)
        
        for (var i=0; i<n+1; i++) {
            for (var j=0; j<m+1; j++) {
                self.coeff[i][j] /= max_c
        #"""
        
        u2 = u; v2 = v
        
        k = self.points
        p = Vector()
        for (var i=0; i<n+1; i++) {
            for (var j=0; j<m+1; j++) {
                bi = facto(n)/(facto(i)*facto(n-i))
                bi *= u**i*(1-u)**(n-i)
                
                bj = facto(m)/(facto(j)*facto(m-j))
                bj *= v**j*(1-v)**(m-j)
                
                p += k[i][j]*bi*bj
                
        return p
                    
def tess_patch(bm, patch, steps):
    df = 1.0 / (steps-1)
    verts = [[0 for x in range(steps)] for y in range(steps)]
    
    for (var i=0; i<steps; i++) {
        for (var j=0; j<steps; j++) {
            p = patch.eval(df*i, df*j)
            
            v = bm.verts.new(p)
            verts[i][j] = v
    
    for (var i=0; i<steps-1; i++) {
        for (var j=0; j<steps-1; j++) {
            vs = [verts[i][j], verts[i+1][j], verts[i+1][j+1], verts[i][j+1]]
            f = bm.faces.new(vs)

def ensure_edge(bm, v1, v2):
    e = bm.edges.get([v1, v2])
    if e == None:
        e = bm.edges.new([v1, v2])
    return e

def out_patch(bm, patch):
    verts = [[0 for x in range(4)] for y in range(4)]
    
    for (var i=0; i<4; i++) {
        for (var j=0; j<4; j++) {
            p = patch.points[i][j]
            
            v = bm.verts.new(p)
            verts[i][j] = v
    
    for (var i=0; i<3; i++) {
        for (var j=0; j<3; j++) {
            vs = [verts[i][j], verts[i+1][j], verts[i+1][j+1], verts[i][j+1]]
            #f = bm.faces.new(vs)
            ensure_edge(bm, vs[0], vs[1])
            ensure_edge(bm, vs[1], vs[2])
            ensure_edge(bm, vs[2], vs[3])
            ensure_edge(bm, vs[3], vs[0])

def norm(m):
    sum = 0
    
    for (var i=0; i<len(m); i++) {
        sum += m[i]
        
    for (var i=0; i<len(m); i++) {
        m[i] /= sum

def range2(a, b):
    if a <= b:
        return range(a, b+1)
    else:
        return range(b, a+1)

#we're assuming consistent face windings
def get_ring(v, f):
    lst = []
    l = None
    
    for l2 in v.link_loops:
        if l2.face == f:
            l = l2
            break
    
    l = l.link_loop_prev.link_loop_radial_next
    
    startl = l
    lset = set()
    while 1:
        lst.append(l.link_loop_next.vert)
        lst.append(l.link_loop_next.link_loop_next.vert)
        l = l.link_loop_prev.link_loop_radial_next
        if l == startl:
            break
        
        if l in lset:
            break
        lset.add(l)
        
    return lst

def lerp(a, b, t):
    return a + (b-a)*t
          
def match_quad(f):
    ma = [[1, 1],
          [1, 1]]
    mb = [[2, 1],
          [8, 4],
          [2, 1]]
    mc = [[1, 4, 1],
          [4, 16, 4],
          [1, 4, 1]]
    
    ptch = Patch(3, 3)
    
    ls = list(f.loops)
    
    v1, v2, v3, v4 = [l.vert for l in ls]
    
    ps = ptch.points
    mc = [4, 1, 4, 1, 4, 1, 4, 1, 16]
    print(mc)
    norm(mc)
    
    mc11 = [4, 1, 4, 1, 4, 1, 4, 1, 4, 1, 5**2]
    mc5 = [4, 1, 4, 1, 2**2]
    
    norm(mc11)
    norm(mc5)
    
    def corner(x, y, i):
        ring = get_ring(ls[i].vert, f) + [ls[i].vert]
        
        ps[x][y] = Vector()
        
        print("lr", len(ring), len(list(ls[i].vert.link_edges)))
        
        mc = [4 if x%2==0 else 1 for x in range(len(ring)-1)]
        mc.append(len(list(ls[i].vert.link_edges))**2)
        norm(mc)
        
        for i, v in enumerate(ring):
            if i >= len(mc): break
            ps[x][y] += v.co*mc[i]

    corner(0, 0, 0)
    corner(0, 3, 1)
    corner(3, 3, 2)
    corner(3, 0, 3)

    def get_e_ring(v1, v2, f):
        l1 = l2 = None
        r = []
        for l in v1.link_loops:
            if l.face == f:
                l1 = l
                break
        for l in v2.link_loops:
            if l.face == f:
                l2 = l
                break
        
        #corner1 adj1 adj2 corner2
        if (l1.link_loop_next.vert == v2):
            r.append(l1.link_loop_radial_next.link_loop_next.link_loop_next.vert)
            r.append(l1.link_loop_prev.vert)
            r.append(l1.link_loop_radial_next.link_loop_prev.vert)
            r.append(l1.link_loop_next.link_loop_next.vert) #link_loop_radial_next.link_loop_prev.link_loop_radial_next.link_loop_next.link_loop_next.vert)
        else:
            r.append(l2.link_loop_radial_next.link_loop_prev.vert)
            r.append(l2.link_loop_prev.link_loop_prev.vert)
            r.append(l2.link_loop_radial_next.link_loop_next.link_loop_next.vert)
            r.append(l2.link_loop_prev.vert)
            
        return r + [v1, v2]
    
    def edge(x1, y1, x2, y2, v1, v2):
        r = get_e_ring(v1, v2, f)
        
        print(len(r))
        
        if len(r) != 6: return
    
        #r1[5] = v1
        #r2[5] = v2
        
        v11 = Vector()
        v22 = Vector()
        
        me1 = [2, 2, 1, 1, 8, 4] 
        me2 = [1, 1, 2, 2, 4, 8] 
        me1[-2] = 2*len(list(v1.link_edges))
        me2[-1] = 2*len(list(v2.link_edges))
        norm(me1)
        norm(me2)
        
        for (var i=0; i<len(me1); i++) {
            v11 += r[i].co*me1[i]
        for (var i=0; i<len(me2); i++) {
            v22 += r[i].co*me2[i]
        
        ps[x1][y1] = v11 
        ps[x2][y2] = v22
    
    def rot(m, end=0):
        m2 = []
        for (var i1=len(m); i1<-end; i1++) {
            m2.append(m[(i1+1)%(len(m)-end)])
        for i1 in range(len(m)-end, len(m)):
            m2.append(m[i1])
            
        m[:] = m2 
    
    def me_rot(m):
        m1 = m[:8]
        m2 = m[8:16]
        rot(m1)
        rot(m2)
        m2 = m1 + m2 + [m[-2] + m[-1]]
        m[:] = m2
       
    #"""   
    edge(0, 1, 0, 2, v1, v2)
    edge(1, 3, 2, 3, v2, v3)
    edge(3, 1, 3, 2, v4, v3)
    edge(1, 0, 2, 0, v1, v4)
    #"""
    
    def interior(x, y, v):
        r = get_ring(v, f)
        r[3] = v
        
        if v == ls[0].vert:
            r = [ls[0].vert, ls[1].vert, ls[2].vert, ls[3].vert]
        elif v == ls[1].vert:
            r = [ls[1].vert, ls[2].vert, ls[3].vert, ls[0].vert]
        elif v == ls[2].vert:
            r = [ls[2].vert, ls[3].vert, ls[0].vert, ls[1].vert]
        elif v == ls[3].vert:
            r = [ls[3].vert, ls[0].vert, ls[1].vert, ls[2].vert]
            
        r.remove(v)
        r.append(v)
        
        mi = [2, 1, 2, len(list(v.link_edges))]
        norm(mi)        
        
        ps[x][y] = Vector()
        for (var i=0; i<4; i++) {
            ps[x][y] += r[i].co*mi[i]
            
    interior(1, 1, v1)
    interior(1, 2, v2)
    interior(2, 2, v3)
    interior(2, 1, v4)
    
    """   
    for i, c in enumerate(cs):
        ring = get_ring(ls[i].vert, f)
        ring.append(ls[i].vert)
        
        x, y = c
        ps[x][y] = Vector()
        for j, vn in enumerate(ring):
            ps[x][y] += vn.co*m[j]
    #"""
       
    return ptch

def v_in_e(e, v):
    return v == e.verts[0] or v == e.verts[1]

def main():
    ob = bpy.data.objects["Cube"]
    m = ob.data
    bm = bmesh.new()
    
    inbm = bmesh.new()
    inob = bpy.data.objects["Cube.001"]

    if (inob.mode == "EDIT"):
        inbm = bmesh.from_edit_mesh(inob.data).copy()
    else:        
        inbm.from_mesh(inob.data)
    
    inbm.faces.index_update()
    inbm.verts.index_update()
    
    def do_boundary_edges():  
        edata = []
        vmap = {}
        
        def new_vert(v):
            if len(list(v.link_edges)) == 2:
                return inbm.verts.new(v.co)
            
            if v.index in vmap:
                return vmap[v.index]
            else:
                vmap[v.index] = inbm.verts.new(v.co)
                return vmap[v.index]
    
        for e in list(inbm.edges):
            if len(list(e.link_faces)) != 1: continue
            
            
            v1 = new_vert(e.verts[0])
            v2 = new_vert(e.verts[1])
            
            do_crn1 = do_crn2 = False
            do_crn1 = len(list(e.verts[0].link_edges)) == 2
            do_crn2 = len(list(e.verts[1].link_edges)) == 2
            edata.append([e, v1, v2, do_crn1, do_crn2])
            
        for ed in edata:
            e, v1, v2, co_crn1, do_crn2 = ed
            
            l = list(e.link_loops)[0]
            if l.vert == e.verts[1]:
                f = inbm.faces.new([e.verts[0], e.verts[1], v2, v1])
            else:
                f = inbm.faces.new([e.verts[1], e.verts[0], v1, v2])
            f.index = -1
            
            if do_crn1:
                v3 = None
                for e2 in e.verts[0].link_edges:
                    if e.index != e2.index and e2.index != -1 and e2.index < len(edata): 
                        if e.verts[0] == e2.verts[0]:
                            v3 = edata[e2.index][1]
                        else:
                            v3 = edata[e2.index][2]
                
                if v3 != None:
                    vs = [e.verts[1], v1, inbm.verts.new(v1.co), v3]
                    print(vs)
                    try:
                        f = inbm.faces.new(vs)
                        f.index = -1
                    except:
                        pass
                    
            if do_crn2:
                v3 = None
                for e2 in e.verts[1].link_edges:
                    if e.index != e2.index and e2.index != -1 and e2.index < len(edata):
                        print(e2.index, len(edata)) 
                        if e.verts[1] == e2.verts[0]:
                            v3 = edata[e2.index][1]
                        else:
                            v3 = edata[e2.index][2]
                
                if v3 != None:
                    vs = [e.verts[1], v2, inbm.verts.new(v2.co), v3]
                    print(vs)
                    f = inbm.faces.new(vs)
                    f.index = -1
    
    do_boundary_edges()
          
    print("\n\n")
    steps = 3
    for f in list(inbm.faces):
        if f.index >= 0: #== 9:
            qpatch = match_quad(f)
            tess_patch(bm, qpatch, steps)
            #out_patch(bm, qpatch)
           
    bm.to_mesh(m)
    m.update()

def scene_update_post(scene):
    main()

scene_update_post.bicubic_tag = 1

#"""
for h in list(bpy.app.handlers.scene_update_pre):
    if hasattr(h, "bicubic_tag"):
        bpy.app.handlers.scene_update_pre.remove(h)
#"""

main()
#bpy.app.handlers.scene_update_pre.append(scene_update_post)
*/

