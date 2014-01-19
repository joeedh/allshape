uniform float16 time;

float level_noise(float16 rco)
{
  vec2 r_vec = vec2(gl_FragCoord[0]/(width), gl_FragCoord[1]/(height));
  r_vec = vec2(r_vec[0]*2.0, r_vec[1]*2.0);
  float rn = f16_to_f32(texture2D(sampler2d, r_vec)[1]);

  r_vec = vec2(r_vec[0]/4.0, r_vec[1]/4.0);
  float rn2 = f16_to_f32(texture2D(sampler2d, r_vec)[1]);

  r_vec = vec2(r_vec[0]*8.0, r_vec[1]*8.0);
  float rn3 = f16_to_f32(texture2D(sampler2d, r_vec)[1]);
  
  return rn2*0.4 + rn*0.1 + rn3*0.1;
}

output float co[3];

void main() {
  float x1 = floor(f16_to_f32(gl_FragCoord[0]));
  float y1 = floor(f16_to_f32(gl_FragCoord[1]));
  
  float16 a = f32_to_f16(y1*f16_to_f32(width)+x1);
  float verts[9];
  
  float16 x;
  float16 y;
  float16 start = floor16(a);
  float16 width2 = width;
  float16 height2 = height;
  
  y = floor16(start/width2);
  x = floor16(start-y*width2);

  float norm[2];
  norm[0] = f16_to_f32(x/width2);
  norm[1] = f16_to_f32(y/height2);
  
  set_current_stream_position();
  
  float pixsize = 1.0 / f16_to_f32(width2);
  
  float16 rco;
  float rnd;
  
  float norm2[2];
  norm2[0] = norm[0];
  norm2[1] = norm[1];
  /*
  for (int i=0; i<3; i++) {
    
    if (i == 0) {
      norm[0] = norm2[0]; norm[1] = norm2[1];
    } else if (i == 1) {
      norm[0] = norm2[0]+pixsize; norm[1] = norm2[1];
    } else if (i == 2) {
      norm[0] = norm2[0]+pixsize; norm[1] = norm2[1]+pixsize;
    }
    */
    rco = f32_to_f16(norm[0]*norm[1]);
    rnd = level_noise(rco);
    
    verts[0] = (norm[0])*5;
    verts[1] = (norm[1])*5;
    norm[0] -= 0.49;
    norm[1] -= 0.49;
    verts[2] = rnd*0.1 + (rnd*0.2 + 0.8)*(1.0 + 0.35*f16_to_f32(sin16(time*3+16*f32_to_f16(8*sqrt((norm[0]*norm[0]) + norm[1]*norm[1])))));
  
    co[0] = verts[0];
    co[1] = verts[1];
    co[2] = verts[2];
  //}
}
