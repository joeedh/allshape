var csg_vert_shader = """//vertex
    precision mediump float;
    
    uniform mat4 u_modelViewProjMatrix;
    uniform mat4 u_cameraMatrix;
    uniform mat4 u_normalMatrix;
    uniform mat4 normalinv;
    uniform float mode; //0=isect, 1=subtract, 2=union
    
    attribute vec4 vPosition;
    attribute vec4 vColor;
    attribute vec4 vNormal;
    
    varying vec4 g_Color;
    varying vec3 v_Normal;
    varying float v_Dot;
    varying vec2 v_texCoord;
    
    void main()
    {
        gl_Position = u_modelViewProjMatrix * vPosition;
        v_Normal = (normalinv * vNormal).xyz;
        v_Normal = normalize(v_Normal);
    }

""";