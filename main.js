'use strict';

let gl; // The webgl context.
let surface; // A surface model
let shProgram; // A shader program
let spaceball; // A SimpleRotator object that lets the user rotate the view by mouse.
let stereoCamera;
let rotationMatrix;
let vertices = CreateSurfaceData();
let sphereVertices = createSphereData();

const eyeSeparationSlider = document.getElementById('Eye_separation');
const fieldOfViewSlider = document.getElementById('Field_of_View');
const nearClippingSlider = document.getElementById('Near_Clipping');
const convergenceSlider = document.getElementById('Convergence');
const toggleInput = document.getElementById('myToggle');
const videoElement = document.querySelector('video');
const canvasElement = document.querySelector('canvas');
const videoElementHolder = document.querySelector('.videoElement');

// Add an event listener to the toggle input
toggleInput.addEventListener('change', function () {
  if (this.checked) {
    // Activate the video
    videoElementHolder.classList.add('active');
    canvasElement.classList.add('active');
  } else {
    // Deactivate the video
    videoElementHolder.classList.remove('active');
    canvasElement.classList.remove('active');
  }
});

// navigator.mediaDevices
//   .getUserMedia({ video: true })
//   .then((stream) => {
//     videoElement.srcObject = stream;
//     videoElement.play();
//   })
//   .catch((error) => {
//     console.error('Error accessing user media', error);
//   });

eyeSeparationSlider.addEventListener('input', stereoCam);
fieldOfViewSlider.addEventListener('input', stereoCam);
convergenceSlider.addEventListener('input', stereoCam);
nearClippingSlider.addEventListener('input', stereoCam);

function stereoCam() {
  drawBoth();
  stereoCamera.eyeSeparation = parseFloat(eyeSeparationSlider.value);
  stereoCamera.convergence = parseFloat(convergenceSlider.value);
  stereoCamera.fov = deg2rad(parseFloat(fieldOfViewSlider.value));
  stereoCamera.nearClipping = parseFloat(nearClippingSlider.value);
}

function deg2rad(angle) {
  return (angle * Math.PI) / 180;
}

function createSphereData() {
  const offset = 2.2;
  const radius = 0.5;
  const slices = 16;
  const stacks = 16;
  const vertices = [];

  for(let stackNumber = 0; stackNumber <= stacks; stackNumber++) {
    const theta = stackNumber * Math.PI / stacks;
    const nextTheta = (stackNumber + 1) * Math.PI / stacks;

    for(let sliceNumber = 0; sliceNumber <= slices; sliceNumber++) {
      const phi = sliceNumber * 2 * Math.PI / slices;
      const nextPhi = (sliceNumber + 1) * 2 * Math.PI / slices;
      const x1 = radius * Math.sin(theta) * Math.cos(phi);
      const y1 = radius * Math.cos(theta);
      const z1 = radius * Math.sin(theta) * Math.sin(phi);
      const x2 = radius * Math.sin(nextTheta) * Math.cos(nextPhi);
      const y2 = radius * Math.cos(nextTheta);
      const z2 = radius * Math.sin(nextTheta) * Math.sin(nextPhi);

      vertices.push(x1 + offset, y1 + offset, z1 + offset);
      vertices.push(x2 + offset, y2 + offset, z2 + offset);
    }
  }

  return vertices;
}

// Constructor
function Model(name) {
  this.name = name;
  this.iVertexBuffer = gl.createBuffer();

  this.BufferData = function () {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices.concat(sphereVertices)), gl.STREAM_DRAW);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);
  };
}

// Constructor
function ShaderProgram(name, program) {
  this.name = name;
  this.prog = program;

  // Location of the attribute variable in the shader program.
  this.iAttribVertex = -1;
  // Location of the uniform specifying a color for the primitive.
  this.iColor = -1;
  // Location of the uniform matrix representing the combined transformation.
  this.iModelViewProjectionMatrix = -1;

  this.Use = function () {
    gl.useProgram(this.prog);
  };
}

function LeftPOV(stereoCamera) {
  const { eyeSeparation, convergence, aspectRatio, fov, nearClipping, far } = stereoCamera;
  const top = nearClipping * Math.tan(fov / 2);
  const bottom = -top;

  const a = aspectRatio * Math.tan(fov / 2) * convergence;
  const b = a - eyeSeparation / 2;
  const c = a + eyeSeparation / 2;

  const left = (-b * nearClipping) / convergence;
  const right = (c * nearClipping) / convergence;

  return m4.frustum(left, right, bottom, top, nearClipping, far);
}
function RightPOV(stereoCamera) {
  const { eyeSeparation, convergence, aspectRatio, fov, nearClipping, far } = stereoCamera;
  const top = nearClipping * Math.tan(fov / 2);
  const bottom = -top;

  const a = aspectRatio * Math.tan(fov / 2) * convergence;
  const b = a - eyeSeparation / 2;
  const c = a + eyeSeparation / 2;

  const left = (-c * nearClipping) / convergence;
  const right = (b * nearClipping) / convergence;
  return m4.frustum(left, right, bottom, top, nearClipping, far);
}

/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw(POV) {
  gl.clearColor(0, 0, 0, 1);
  //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  let projection;
  /* Set the values of the projection transformation */
  if (POV === 'Left') {
    gl.colorMask(false, true, true, true);
    projection = LeftPOV(stereoCamera);
  } else {
    gl.colorMask(true, false, false, true);
    projection = RightPOV(stereoCamera);
  }

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

  /* Draw the six faces of a cube, with different colors. */
  gl.uniform4fv(shProgram.iColor, [1, 1, 1, 1]);

  gl.drawArrays(gl.LINE_STRIP, 0, vertices.length / 3);

  if (rotationMatrix) {
    matAccum1 = m4.multiply(matAccum1, rotationMatrix);
  }

  modelViewProjection = m4.multiply(projection, matAccum1);
  gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);

  gl.drawArrays(gl.LINE_STRIP, vertices.length / 3, sphereVertices.length / 3);
}

function drawBoth() {
  draw('Right');
  draw('Left');
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
function virich(i, j) {
  let a = 1.5;
  let b = 3;
  let c = 2;
  let d = 4;
  let x =
    0.2 *
    (f(a, b, j) * (1 + Math.cos(i) + (d ** 2 - c ** 2) * ((1 - Math.cos(i)) / f(a, b, j)))) *
    Math.cos(j);
  let y =
    0.2 *
    (f(a, b, j) * (1 + Math.cos(i) + (d ** 2 - c ** 2) * ((1 - Math.cos(i)) / f(a, b, j)))) *
    Math.sin(j);
  let z = 0.2 * (f(a, b, j) - (d ** 2 - c ** 2) / f(a, b, j)) * Math.sin(i);
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
  shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, 'ModelViewProjectionMatrix');
  shProgram.iColor = gl.getUniformLocation(prog, 'color');

  surface = new Model('Surface');
  surface.BufferData(CreateSurfaceData());

  const ap = gl.canvas.width / gl.canvas.height;

  stereoCamera = {
    eyeSeparation: 0.05,
    convergence: 1,
    aspectRatio: ap,
    fov: deg2rad(100),
    nearClipping: 4,
    far: 20,
  };

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
  let canvas;
  try {
    canvas = document.getElementById('webglcanvas');
    gl = canvas.getContext('webgl');
    if (!gl) {
      throw 'Browser does not support WebGL';
    }
  } catch (e) {
    document.getElementById('canvas-holder').innerHTML =
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
  spaceball = new TrackballRotator(canvas, drawBoth, 0);

    if ("Magnetometer" in window) {
      const sensor = new Magnetometer({ frequency: 60 });
      sensor.addEventListener("reading", () => {
        const rotationX = Math.atan2(sensor.y, sensor.z);
        const rotationY = Math.atan2(sensor.x, sensor.z);
        const rotationZ = Math.atan2(sensor.y, sensor.x);
        const mX = m4.xRotation(rotationX);
        const mY = m4.yRotation(rotationY);
        const mZ = m4.zRotation(rotationZ);
        const acc = m4.multiply(mX, mY);
        rotationMatrix = m4.multiply(acc, mZ);

        drawBoth();
      });
      sensor.start();

    } else {
      console.error("Magnetometer is not in window");
    }
  drawBoth();
}
