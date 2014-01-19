uniform mat4 u_modelViewProjMatrix;
uniform mat4 u_cameraMatrix;
uniform mat4 u_normalMatrix;
uniform float16 steps;
uniform float16 patch1;
uniform float16 data_size;
uniform vec3 lightDir1;
uniform vec4 face_color;

attribute vec2 vPosition;

varying float16 v_Dot;
varying vec2 v_texCoord;
varying vec4 g_Color;
varying vec3 v_Normal;

vec3 get_patch1_point(float16 f, float16 fx, float16 fy)
{
  float16 c; float16 ds;
  
  ds = 0.0; //(0.5 / data_size);
  
  c = floor16(4.0*4.0*3.0*f + fy*4.0*3.0 + fx*3.0);
  
  float16 cy1 = floor16(c/data_size)+0.0001;
  float16 cx1 = mod16(c, data_size)+0.0001;
  
  float16 cy2 = floor16((c+1.0)/data_size)+0.0001;
  float16 cx2 = mod16(c+1.0, data_size)+0.0001;

  float16 cy3 = floor16((c+2.0)/data_size)+0.0001;
  float16 cx3 = mod16(c+2.0, data_size)+0.0001;
  
  cx1 += ds; cy1 += ds; cx2 += ds; cy2 += ds; 
  cx3 += ds; cy3 += ds;
  
  cx1 /= data_size; cx2 /= data_size; cx3 /= data_size; 
  cy1 /= data_size; cy2 /= data_size; cy3 /= data_size; 
  
  return vec3(texture2D(sampler2d, vec2(cx1, cy1))[3], 
    texture2D(sampler2d, vec2(cx2, cy2))[3], 
    texture2D(sampler2d, vec2(cx3, cy3))[3]);
}

float16 ptab(float16 i)
{
  if (abs16(i) < 0.01) return 1.0;
  else if (abs16(i-1) < 0.01) return 3.0;
  else if (abs16(i-2) < 0.01) return 3.0;
  else return 1.0;
}

vec4 eval(float16 f, float16 u, float16 v)
{
  vec3 p = vec3(0.0, 0.0, 0.0);
  float16 bi; float16 bj; 
  vec3 c;
  float16 di=0.0; float16 dj=0.0;
  
  for (int i=0; i<4; i++) {
    dj = 0.0;
    for (int j=0; j<4; j++) {
      bi = ptab(di)*pow16(u, di)*pow16(1.0-u, 3.0-di);
      bj = ptab(dj)*pow16(v, dj)*pow16(1.0-v, 3.0-dj);
      
      c = get_patch1_point(f, di, dj);
      p[0] += c[0]*bi*bj;
      p[1] += c[1]*bi*bj;
      p[2] += c[2]*bi*bj;
      
      dj += 1.0;
    }
    di += 1.0;
  }
  
  return vec4(p[0], p[1], p[2], 1.0); //f32_to_f16(p[0]), f32_to_f16(p[1]), f32_to_f16(p[2]), 1.0);
}

vec2 nor_off_uv(float16 u, float16 v)
{
  float16 ul; float16 vl;
  
  /*convert u,v, coordinates to 0..1 range; they
    actually go to 0..1+(1/(step-1))*/
  ul = u*(steps/(steps-1)) - 0.5/(steps);
  vl = v*(steps/(steps-1)) - 0.5/(steps);
  
  ul = min16(max16(ul, 0.0), 1.0);
  vl = min16(max16(vl, 0.0), 1.0);
  
  if (ul > 0.5) {
    ul = abs16(1 - ul);
  }
  
  if (vl > 0.5) {
    vl = abs16(1 - vl);
  } 
  
  float16 ul2; float16 vl2;
  ul2 = 1.0-ul; vl2 = 1.0-vl;

  ul = pow16(ul2, 20)*vl2*0.004;//*vl2;
  vl = pow16(vl2, 20)*ul2*0.004;//*ul2;
  
  ul = max16(ul, 0.001);
  vl = max16(vl, 0.001);
  
  //ul = max16(ul*0.05, 0.0);
  //vl = max16(vl*0.05, 0.0);
  //u = min16(max16(u, ul), 1.0-ul);
  //v = min16(max16(v, vl), 1.0-vl);
  u = ul + u*(1.0-ul*14);
  v = vl + v*(1.0-vl*14);
  
  return vec2(u, v);
}

vec4 normal(float16 f, float16 u, float16 v)
{

  /*float16 df1 = 0.004; //2.0/steps;
  float16 df2 = df1;
  if (u > 0.5) df1 = -df1;
  if (v > 0.5) df2 = -df2;
  
  vec4 p1 = eval(f, u, v);
  vec4 p2 = eval(f, u+df1, v); vec4 p3 = eval(f, u, v+df2); 
  p2 = p2 - p1;
  p3 = p3 - p1;
  
  vec3 n1 = vec3(p2[0], p2[1], p2[2]);
  vec3 n2 = vec3(p3[0], p3[1], p3[2]);
  vec3 n = normalize3(cross3(n1, n2));
  if (u < 0.5 && v > 0.5)
    n = -n;
  if (u > 0.5 && v < 0.5)
    n = -n;
   
  return vec4(n[0], n[1], n[2], 1.0);*/

  vec3 p = vec3(0.0, 0.0, 0.0);
  vec3 p1 = vec3(0.0, 0.0, 0.0);
  vec3 p2 = vec3(0.0, 0.0, 0.0);
  
  float16 bi; float16 bj; 
  vec3 c;
  float16 di=0.0; float16 dj=0.0;
  float16 n; float16 u2; float16 v2;
  float16 u3; float16 v3; float16 vj; 
  float16 ui; float16 s1; float16 s2;
  float16 n2; float16 t;
  
  vec2 off =  nor_off_uv(u, v);
  u = off[0]; v = off[1];
  
  u2 = u*u; u3=u*u*u;
  v2 = v*v; v3 = v*v*v;
  for (int i=0; i<4; i++) {
    dj = 0.0;
    for (int j=0; j<4; j++) {
      ui = pow16(u, di);
      vj = pow16(v, dj);
      n = ui*vj;
      n2 = u3*v3-3*u3*v2+3*u3*v;
      n2 = n2-u3-3*u2*v3+9*u2*v2;
      n2 = n2-9*u2*v+3*u2+3*u*v3;
      n2 = n2-9*u*v2+9*u*v-3*u-v3+3*v2-3*v+1;
      n = n*n2;
      s1 = pow16(1-v, dj);
      s2 = pow16(1-u, di);
      n = n / (s1*s2);
      
      c = get_patch1_point(f, di, dj);
      p1[0] += c[0]*n;
      p1[1] += c[1]*n;
      p1[2] += c[2]*n;
      
      /*ui = pow16(v, dj)*pow16(v, di);
      n = -dj*u*u*u*v*v+2*dj*u*u*u;
      n = n*v-dj*u*u*u*3+3*dj*u*u*v*v;
      n = n-6*dj*u*u*v+3*dj*u*u-3*dj*u*v*v+6*dj*u;
      n = n*v-3*dj*u+dj*v*v-2*dj*v+dj+3*u*u*u*v*v;
      n = n*v-6*u*u*u*v*v+3*u*u*u*v-9*u*u*v*v;
      n = n*v+18*u*u*v*v-9*u*u*v+9*u*v*v*v-18;
      n = n*u*v*v+9*u*v-3*v*v*v+6*v*v-3*v;
      n = n*ui;
      n = n/(pow16(1-v, dj)*dj*pow16(1-u, di)*di*v);

      p2[0] += c[0]*n;
      p2[1] += c[1]*n;
      p2[2] += c[2]*n;*/
      
      
      dj += 1.0;
    }
    di += 1.0;
  }
  
  p = p1; //normalize3(cross3(p1, p2));
  
  //p = normalize3(p);
  return vec4(p[0], p[1], p[2], 1.0);
}

void main()
{
    float16 eps1 = 0.9999;
    float16 eps2 = 0.00005;
    vec4 pos = eval(patch1, abs16(vPosition[0]*eps1+eps2), abs16(vPosition[1]*eps1+eps2));
    
    vec2 noroff = nor_off_uv(vPosition[0], vPosition[1]);
    
    gl_Position = u_modelViewProjMatrix * pos;
    gl_PointSize = 9.0;
    
    vec4 transNormal = u_normalMatrix * normal(patch1, vPosition[0], vPosition[1]);
    float16 f = abs16(texture2D(sampler2d, vPosition)[3]);
    vec3 norm = vec3(transNormal[0], transNormal[1], transNormal[2]);
    norm = normalize3(norm);
    
    g_Color = face_color; //vec4(noroff[0]*noroff[1], noroff[1]*noroff[0], 0, 1.0); //face_color;
    v_texCoord = vec2(0.0, 0.0);
    v_Dot = max16(dot16(norm, lightDir1), 0.0);
    v_Normal = norm;
}