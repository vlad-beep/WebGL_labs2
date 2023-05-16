'use strict';

let gl; // The webgl context.
let surface; // A surface model
let shProgram; // A shader program
let spaceball; // A SimpleRotator object that lets the user rotate the view by mouse.
let point; //variable to display a point on a surface
let userPointCoord; //the coordinate of a point on the texture
let userRotAngle; //texture rotation angle

function deg2rad(angle) {
  return (angle * Math.PI) / 180;
}

// Constructor
function Model(name) {
  this.name = name;
  this.iVertexBuffer = gl.createBuffer();
  this.count = 0;
  this.iTextureBuffer = gl.createBuffer();
  this.countText = 0;

  this.BufferData = function (vertices) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    this.count = vertices.length / 3;
  };

  this.TextureBufferData = function (points) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STREAM_DRAW);

    this.countText = points.length / 2;
  };

  this.Draw = function () {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
    gl.vertexAttribPointer(shProgram.iAttribTexture, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribTexture);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
  };

  //funvtion for drawing a point on the surface
  this.DrawPoint = function () {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);
    gl.drawArrays(gl.LINE_STRIP, 0, this.count);
  };
}

function CreateSphereSurface(r = 0.05) {
  let vertexList = [];
  let lon = -Math.PI;
  let lat = -Math.PI * 0.5;
  while (lon < Math.PI) {
    while (lat < Math.PI * 0.5) {
      let v1 = sphereSurfaceDate(r, lon, lat);
      vertexList.push(v1.x, v1.y, v1.z);
      lat += 0.05;
    }
    lat = -Math.PI * 0.5;
    lon += 0.05;
  }
  return vertexList;
}

function sphereSurfaceDate(r, u, v) {
  let x = r * Math.sin(u) * Math.cos(v);
  let y = r * Math.sin(u) * Math.sin(v);
  let z = r * Math.cos(u);
  return { x: x, y: y, z: z };
}

// Constructor
function ShaderProgram(name, program) {
  this.name = name;
  this.prog = program;

  // Location of the attribute variable in the shader program.
  this.iAttribVertex = -1;
  this.iAttribTexture = -1;
  // Location of the uniform specifying a color for the primitive.
  this.iColor = -1;
  // Location of the uniform matrix representing the combined transformation.
  this.iModelViewProjectionMatrix = -1;
  //відповідні змінні для передачі у шейдер
  this.iUserPoint = -1;
  this.irotAngle = 0;
  this.iUP = -1;
  this.iTMU = -1;

  this.Use = function () {
    gl.useProgram(this.prog);
  };
}

/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  /* Set the values of the projection transformation */
  // let projection = m4.perspective(Math.PI / 8, 1, 8, 12);
  let projection = m4.perspective(Math.PI / 8, 1, 8, 12);

  /* Get the view matrix from the SimpleRotator object.*/
  let modelView = spaceball.getViewMatrix();

  let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
  let translateToPointZero = m4.translation(0, 0, -10);

  let matAccum0 = m4.multiply(rotateToPointZero, modelView);
  let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

  /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
  let modelViewProjection = m4.multiply(projection, matAccum1);

  gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);

  //passing variables to the shader
  gl.uniform1i(shProgram.iTMU, 0);
  gl.enable(gl.TEXTURE_2D);
  gl.uniform2fv(shProgram.iUserPoint, [userPointCoord.x, userPointCoord.y]);
  gl.uniform1f(shProgram.irotAngle, userRotAngle);
  gl.uniform2fv(shProgram.iUserPoint, [userPointCoord.x, userPointCoord.y]); //giving coordinates of user point
  gl.uniform1f(shProgram.irotAngle, userRotAngle);

  surface.Draw();
  let translation = virich(
    map(userPointCoord.x, 0, 1, 0, Math.PI * 2),
    map(userPointCoord.y, 0, 1, 0, Math.PI * 2),
  );
  gl.uniform3fv(shProgram.iUP, [translation.x, translation.y, translation.z]);
  gl.uniform1f(shProgram.irotAngle, 1100);
  point.DrawPoint();
}

function CreateSurfaceData() {
  let vertexList = [];

  let i = 0;
  let j = 0;
  while (i <= Math.PI * 2) {
    while (j <= Math.PI * 2) {
      let v1 = virich(i, j);
      let v2 = virich(i + 0.1, j);
      let v3 = virich(i, j + 0.1);
      let v4 = virich(i + 0.1, j + 0.1);
      vertexList.push(v1.x, v1.y, v1.z);
      vertexList.push(v2.x, v2.y, v2.z);
      vertexList.push(v3.x, v3.y, v3.z);
      vertexList.push(v2.x, v2.y, v2.z);
      vertexList.push(v4.x, v4.y, v4.z);
      vertexList.push(v3.x, v3.y, v3.z);
      j += 0.1;
    }
    j = 0;
    i += 0.1;
  }
  return vertexList;
}

function map(val, f1, t1, f2, t2) {
  let m;
  m = ((val - f1) * (t2 - f2)) / (t1 - f1) + f2;
  return Math.min(Math.max(m, f2), t2);
}

//function for creating a buffer of texture coordinates
function CreateTextureData() {
  let vertexList = [];
  let i = 0;
  let j = 0;
  while (i <= Math.PI * 2) {
    while (j <= Math.PI * 2) {
      let u = map(i, 0, Math.PI * 2, 0, 1);
      let v = map(j, 0, Math.PI * 2, 0, 1);
      vertexList.push(u, v);
      u = map(i + 0.1, 0, Math.PI * 2, 0, 1);
      vertexList.push(u, v);
      u = map(i, 0, Math.PI * 2, 0, 1);
      v = map(j + 0.1, 0, Math.PI * 2, 0, 1);
      vertexList.push(u, v);
      u = map(i + 0.1, 0, Math.PI * 2, 0, 1);
      v = map(j, 0, Math.PI * 2, 0, 1);
      vertexList.push(u, v);
      u = map(i + 0.1, 0, Math.PI * 2, 0, 1);
      v = map(j + 0.1, 0, Math.PI * 2, 0, 1);
      vertexList.push(u, v);
      u = map(i, 0, Math.PI * 2, 0, 1);
      v = map(j + 0.1, 0, Math.PI * 2, 0, 1);
      vertexList.push(u, v);
      j += 0.1;
    }
    j = 0;
    i += 0.1;
  }
  return vertexList;
}

function virich(i, j) {
  let a = 1.5;
  let b = 3;
  let c = 2;
  let d = 4;
  let x =
    0.05 *
    (f(a, b, j) * (1 + Math.cos(i) + (d ** 2 - c ** 2) * ((1 - Math.cos(i)) / f(a, b, j)))) *
    Math.cos(j);
  let y =
    0.05 *
    (f(a, b, j) * (1 + Math.cos(i) + (d ** 2 - c ** 2) * ((1 - Math.cos(i)) / f(a, b, j)))) *
    Math.sin(j);
  let z = 0.05 * (f(a, b, j) - (d ** 2 - c ** 2) / f(a, b, j)) * Math.sin(i);
  return { x: x, y: y, z: z };
}
function f(a, b, j) {
  return (a * b) / Math.sqrt(a ** 2 * Math.sin(j) ** 2 + b ** 2 * Math.cos(j) ** 2);
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
  let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  shProgram = new ShaderProgram('Basic', prog);
  shProgram.Use();

  shProgram.iAttribVertex = gl.getAttribLocation(prog, 'vertex');
  shProgram.iAttribTexture = gl.getAttribLocation(prog, 'texture');
  shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, 'ModelViewProjectionMatrix');
  shProgram.iUserPoint = gl.getUniformLocation(prog, 'userPoint');
  shProgram.irotAngle = gl.getUniformLocation(prog, 'rotA');
  shProgram.iUP = gl.getUniformLocation(prog, 'translateUP');
  shProgram.iTMU = gl.getUniformLocation(prog, 'tmu');

  point = new Model('Point');
  surface = new Model('Surface');
  surface.BufferData(CreateSurfaceData());
  LoadTexture();
  surface.TextureBufferData(CreateTextureData());
  point.BufferData(CreateSphereSurface());

  gl.enable(gl.DEPTH_TEST);
}

/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
  let vsh = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsh, vShader);
  gl.compileShader(vsh);
  if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
    throw new Error('Error in vertex shader:  ' + gl.getShaderInfoLog(vsh));
  }
  let fsh = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fsh, fShader);
  gl.compileShader(fsh);
  if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
    throw new Error('Error in fragment shader:  ' + gl.getShaderInfoLog(fsh));
  }
  let prog = gl.createProgram();
  gl.attachShader(prog, vsh);
  gl.attachShader(prog, fsh);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error('Link error in program:  ' + gl.getProgramInfoLog(prog));
  }
  return prog;
}

/**
 * initialization function that will be called when the page has loaded
 */
function init() {
  userPointCoord = { x: 0.1, y: 0.1 };
  userRotAngle = 0.0;
  let canvas;
  try {
    let resolution = Math.min(window.innerHeight, window.innerWidth);
    canvas = document.querySelector('canvas');
    gl = canvas.getContext('webgl');
    canvas.width = resolution;
    canvas.height = resolution;
    gl.viewport(0, 0, resolution, resolution);
    if (!gl) {
      throw 'Browser does not support WebGL';
    }
  } catch (e) {
    document.querySelector('"canvas-holder"').innerHTML =
      '<p>Sorry, could not get a WebGL graphics context.</p>';
    return;
  }
  try {
    initGL(); // initialize the WebGL graphics context
  } catch (e) {
    document.getElementById('canvas-holder').innerHTML =
      '<p>Sorry, could not initialize the WebGL graphics context: ' + e + '</p>';
    return;
  }

  spaceball = new TrackballRotator(canvas, draw, 0);

  draw();
}

//function to load the texture
function LoadTexture() {
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const image = new Image();
  image.crossOrigin = 'anonymus';

  image.src = 'https://raw.githubusercontent.com/vlad-beep/WebGL_labs/PGW/texture.png';
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    console.log('imageLoaded');
    draw();
  };
}

window.onkeydown = (e) => {
  switch (e.keyCode) {
    case 87:
      userPointCoord.x -= 0.01;
      break;
    case 83:
      userPointCoord.x += 0.01;
      break;
    case 65:
      userPointCoord.y += 0.01;
      break;
    case 68:
      userPointCoord.y -= 0.01;
      break;
  }
  userPointCoord.x = Math.abs(userPointCoord.x % 1);
  userPointCoord.y = Math.abs(userPointCoord.y % 1);
  draw();
};

//function to rotate the texture
onmousemove = (e) => {
  userRotAngle = map(e.clientX, 0, window.outerWidth, 0, Math.PI);
  draw();
};
