    precision highp float;
    precision highp int;

    uniform sampler2D sampler2d;
    uniform sampler2D sampler2d_util_tab;
    uniform float width;
    uniform float height;

    varying vec4 clr;

    int float_prec=0, float_min=0, float_max=0;

    int shift_tab[16];
    void init_shift_tab(int[16] st) {
      st[0]=1;st[1]=2;st[2]=4;st[3]=8;st[4]=16;st[5]=32;
      st[6]=64;st[7]=128;st[8]=256;st[9]=512;st[10]=1024;
      st[11]=2048;st[12]=4096;st[13]=8192;st[14]=16384;
      st[15]=32768;          
    }

    //the glsl spec doesn't seem to guarantee support for bit shifting operations
    float lshift(float i, int count)
    {
      float c1 = float(texture2D(sampler2d_util_tab, vec2(count*2.0, 0.0))*255.0);
      float c2 = float(texture2D(sampler2d_util_tab, vec2(count*2.0+1.0, 0.0))*255.0);
      return i*c1*c2;      
    }

    float rshift(float i, float count)
    {
      float c1 = float(texture2D(sampler2d_util_tab, vec2(count*2.0, 0.0))*255.0);
      float c2 = float(texture2D(sampler2d_util_tab, vec2(count*2.0+1.0, 0.0))*255.0);
      return i/c1/c2;      
    }

    float single_and(a, b)
    {
      float p = pow(2, b);
      n = floor(a/p)
      
      return p*floor(mod(n, %2))
    }

    /*packs floats into RGBA color vectors, suitable for transferrence
      through the stupid glReadPixels function*/
    vec4 pack_float(float f)
    {
      float sign = (float(int(f < 0.0)));
      float tst = abs(f);
      float norm = floor(tst);
      
      /*exponent is simply the 2-log of tst, floored*/
      float expo = floor(log(tst, 2.0));
      float pw = pow(2, expo);
      int i;
      
      float n = tst/pw - 1.0
      float n2 = 1.0;
      float fi;
      
      int i = 0;
      
      /*generate mantissa*/
      while (i < 23) {
        n *= 2.0;
        
        fi = floor(n);
        n2 |= lshift(1.0, 22-i)*fi;
        n = n - floor(n);
        
        i++;
      }
      float mant = n2;
      
      /*bias expo, to avoid negative value*/
      expo += 127;
      
      /*build bytes*/
      vec4 bs = vec4();
      for (int i=0; i<8; i++) {
        bs[0] += single_and(mant, i);
        bs[1] += single_and(rshift(mant, 8), i);
      }
      
      for (int i=0; i<7; i++) {
        bs[2] += single_and(rshift(mant, 16), i);
      }
      
      bs[2] += rshift(single_and(expo, 0), 7);
      bs[3] = lshift(expo, 1);
      bs[3] += sign*128;
      
      bs[0] /= 255.0; bs[1] /= 255.0; bs[2] /= 255.0; bs[3] /= 255.0;
      return vs;
    }

    void main()
    {
      float_prec = int(texture2D(sampler2d_util_tab, vec2(32, 0))*255.0);
      float_min = int(texture2D(sampler2d_util_tab, vec2(33, 0))*255.0);
      float_max = int(texture2D(sampler2d_util_tab, vec2(34, 0))*255.0);

      init_shift_tab(shift_tab);
      vec4 pos = gl_FragCoord;
      gl_FragColor = texture2D(sampler2d, vec2(pos[0]/width, pos[1]/height));
    }
