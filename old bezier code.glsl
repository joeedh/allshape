/*　derivatives for u */

    float di=0.0; float dj=0.0;
    float u2=u*u; float v2=v*v;
    float u3=u2*u; float v3=v2*v;
    
    float a = 36.0*pow(v, dj)*pow(u, di);
    float b = -di*u2*v3 + 3.0*di*u2*v2 - 3.0*di*u2*v + di*u2;
    b = b - 2.0*di*u*v3 - 6.0*di*u*v2 + 6.0*di*u*v - 2.0*di*u - di*v3;
    b = b + 3.0*di*v2 - 3.0*di*v + di + 3.0*u3*v3 - 9.0*u3*v2 + 9.0*u3*v;
    b = b - 3.0*u3 - 6.0*u2*v3 + 18.0*u2*v2 - 18.0*u2*v + 6.0*u2;
    b = b + 3.0*u*v3 - 9.0*u*v2 + 9.0*u*v - 3.0*u;
    float d = pow(1.0-v, dj) * pow(1.0-u, di) * ntab1(di) * ntab1(dj) * ntab2(di) * ntab2(dj) * u;
    
    p[0] += (a*c[0]*b) / d;
    p[1] += (a*c[1]*b) / d;
    p[2] += (a*c[2]*b) / d;*/
    
/*　also derivatives for u.  probably*/
  vec4 normal2(float f, float u, float v)
  {

    /*float df1 = 0.004; //2.0/steps;
    float df2 = df1;
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
/*
    vec3 p = vec3(0.0, 0.0, 0.0);
    vec3 p1 = vec3(0.0, 0.0, 0.0);
    vec3 p2 = vec3(0.0, 0.0, 0.0);
    
    float bi; float bj; 
    vec3 c;
    float di=0.0; float dj=0.0;
    float n; float u2; float v2;
    float u3; float v3; float vj; 
    float ui; float s1; float s2;
    float n2; float t;
    
    vec2 off =  nor_off_uv(u, v);
    u = off[0]; v = off[1];
    
    u2 = u*u; u3=u*u*u;
    v2 = v*v; v3 = v*v*v;
    for (int i=0; i<4; i++) {
      dj = 0.0;
      for (int j=0; j<4; j++) {
        ui = pow(u, di);
        vj = pow(v, dj);
        n = ui*vj;
        n2 = u3*v3-3.0*u3*v2+3.0*u3*v;
        n2 = n2-u3-3.0*u2*v3+9.0*u2*v2;
        n2 = n2-9.0*u2*v+3.0*u2+3.0*u*v3;
        n2 = n2-9.0*u*v2+9.0*u*v-3.0*u-v3+3.0*v2-3.0*v+1.0;
        n = n*n2;
        s1 = pow(1.0-v, dj);
        s2 = pow(1.0-u, di);
        n = n / (s1*s2);
        
        c = get_patch1_point(f, di, dj);
        p1[0] += c[0]*n;
        p1[1] += c[1]*n;
        p1[2] += c[2]*n;
        
        //ui = pow(v, dj)*pow(v, di);
        //n = -dj*u*u*u*v*v+2*dj*u*u*u;
        //n = n*v-dj*u*u*u*3+3*dj*u*u*v*v;
        //n = n-6*dj*u*u*v+3*dj*u*u-3*dj*u*v*v+6*dj*u;
        //n = n*v-3*dj*u+dj*v*v-2*dj*v+dj+3*u*u*u*v*v;
        //n = n*v-6*u*u*u*v*v+3*u*u*u*v-9*u*u*v*v;
        //n = n*v+18*u*u*v*v-9*u*u*v+9*u*v*v*v-18;
        //n = n*u*v*v+9*u*v-3*v*v*v+6*v*v-3*v;
        //n = n*ui;
        //n = n/(pow(1-v, dj)*dj*pow(1-u, di)*di*v);

        //p2[0] += c[0]*n;
        //p2[1] += c[1]*n;
        //p2[2] += c[2]*n;
        
        
        dj += 1.0;
      }
      di += 1.0;
    }
    
    p = p1; //normalize3(cross3(p1, p2));
    */
    //p = normalize3(p);
    return vec4(0,0,0,0); //p[0], p[1], p[2], 1.0);
  }