const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
    throw new Error("WebGL 2 não é suportado.");
}

const vertexShaderSource = `#version 300 es

in vec2 aPosition;

uniform mat3 u_viewTransform;
uniform mat3 u_modelTransform;

void main() {

    vec3 position =
        u_viewTransform *
        u_modelTransform *
        vec3(aPosition, 1.0);

    gl_Position =
        vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es

precision mediump float;

uniform vec3 uColor;

out vec4 outColor;

void main() {

    outColor =
        vec4(uColor, 1.0);
}
`;

function createShader(gl, type, source) {

    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);

    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {

        const error = gl.getShaderInfoLog(shader);

        gl.deleteShader(shader);

        throw new Error(error);
    }

    return shader;
}

function createProgram(
    gl,
    vertexShaderSource,
    fragmentShaderSource
) {

    const vertexShader =
        createShader(
            gl,
            gl.VERTEX_SHADER,
            vertexShaderSource
        );

    const fragmentShader =
        createShader(
            gl,
            gl.FRAGMENT_SHADER,
            fragmentShaderSource
        );

    const program = gl.createProgram();

    gl.attachShader(program, vertexShader);

    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {

        throw new Error(
            gl.getProgramInfoLog(program)
        );
    }

    return program;
}


const program =
    createProgram(
        gl,
        vertexShaderSource,
        fragmentShaderSource
    );


// ==================================================
// CLASSE RENDERER
// ==================================================

class Renderer {

    constructor(gl, program) {
        this.gl = gl;
        this.program = program;

        this.positionLocation =
            gl.getAttribLocation(
                program,
                "aPosition"
            );

        this.colorLocation =
            gl.getUniformLocation(
                program,
                "uColor"
            );

        this.viewTransformLocation =
            gl.getUniformLocation(
                program,
                "u_viewTransform"
            );

        this.modelTransformLocation =
            gl.getUniformLocation(
                program,
                "u_modelTransform"
            );

        this.viewTransform = m3.identity();

        this.verticesBuffer = gl.createBuffer();
    }

    defineViewTransform(viewTransform) {
        this.viewTransform = viewTransform;
    }

    draw(object) {
        const gl = this.gl;

        gl.bindBuffer(
            gl.ARRAY_BUFFER,
            this.verticesBuffer
        );

        gl.bufferData(
            gl.ARRAY_BUFFER,
            object.vertices,
            gl.STATIC_DRAW
        );

        gl.enableVertexAttribArray(
            this.positionLocation
        );

        gl.vertexAttribPointer(
            this.positionLocation,
            2,
            gl.FLOAT,
            false,
            0,
            0
        );

        gl.uniform3fv(
            this.colorLocation,
            object.color
        );

        gl.uniformMatrix3fv(
            this.modelTransformLocation,
            false,
            object.modelTransform
        );

        gl.uniformMatrix3fv(
            this.viewTransformLocation,
            false,
            this.viewTransform
        );

        gl.drawArrays(
            gl.TRIANGLES,
            0,
            object.vertices.length / 2
        );
    }
}


// ==================================================
// AUXILIARY FUNCTIONS
// ==================================================

function rectangleVertices(x, y, width, height) {
    return [
        x, y,
        x + width, y + height,
        x, y + height,

        x, y,
        x + width, y,
        x + width, y + height
    ];
}

function circleVertices(cx, cy, radius, numSegments) {
    const vertices = [];

    for (let i = 0; i < numSegments; i++) {
        const theta1 =
            (i / numSegments) *
            2 * Math.PI;

        const theta2 =
            ((i + 1) / numSegments) *
            2 * Math.PI;

        vertices.push(
            cx,
            cy
        );

        vertices.push(
            cx + radius * Math.cos(theta1),
            cy + radius * Math.sin(theta1)
        );

        vertices.push(
            cx + radius * Math.cos(theta2),
            cy + radius * Math.sin(theta2)
        );
    }

    return vertices;
}


// ==================================================
// CORES
// ==================================================

const COR_CHAO     = new Float32Array([0.18, 0.20, 0.26]);
const COR_CORPO    = new Float32Array([0.16, 0.52, 0.86]);
const COR_PAINEL   = new Float32Array([0.09, 0.13, 0.20]);
const COR_CABECA   = new Float32Array([0.86, 0.88, 0.93]);
const COR_OLHO     = new Float32Array([0.20, 0.95, 0.85]);
const COR_BOCA     = new Float32Array([0.09, 0.13, 0.20]);
const COR_MEMBRO   = new Float32Array([0.33, 0.37, 0.48]);
const COR_SEGMENTO = new Float32Array([0.62, 0.66, 0.75]);
const COR_LUZ      = new Float32Array([0.95, 0.35, 0.30]);


// ==================================================
// MEDIDAS DO ROBÔ
// ==================================================

const CORPO_LARGURA = 0.28;
const CORPO_ALTURA  = 0.42;

const CABECA_LADO = 0.22;
const CABECA_BASE = 0.02;
const CABECA_TOPO = CABECA_BASE + CABECA_LADO;

const OLHO_LADO = 0.05;
const OLHO_X    = 0.05;
const OLHO_Y    = CABECA_BASE + 0.12;

const BOCA_LARGURA = 0.12;
const BOCA_ALTURA  = 0.035;
const BOCA_Y       = CABECA_BASE + 0.05;

const ANTENA_X           = 0.07;
const ANTENA_LARGURA     = 0.02;
const ANTENA_COMPRIMENTO = 0.12;
const ANTENA_RAIO        = 0.035;

const OMBRO_X = 0.17;
const OMBRO_Y = 0.36;

const BRACO_LARGURA         = 0.075;
const BRACO_COMPRIMENTO     = 0.17;
const ANTEBRACO_LARGURA     = 0.065;
const ANTEBRACO_COMPRIMENTO = 0.16;

const QUADRIL_X = 0.10;

const COXA_LARGURA       = 0.10;
const COXA_COMPRIMENTO   = 0.20;
const CANELA_LARGURA     = 0.085;
const CANELA_COMPRIMENTO = 0.18;

const PE_LARGURA = 0.13;
const PE_ALTURA  = 0.05;

const ESCALA = 1.05;
const CHAO_Y = -0.62;


// ==================================================
// VÉRTICES DAS PARTES
// ==================================================

function chaoVertices() {

    const vertices =
        rectangleVertices(-1.4, CHAO_Y - 0.1, 2.8, 0.1);

    return new Float32Array(vertices);
}

function corpoVertices() {

    const vertices =
        rectangleVertices(
            -CORPO_LARGURA / 2,
            0.0,
            CORPO_LARGURA,
            CORPO_ALTURA
        );

    return new Float32Array(vertices);
}

function painelVertices() {

    const vertices =
        rectangleVertices(-0.09, 0.14, 0.18, 0.16);

    return new Float32Array(vertices);
}

function cabecaVertices() {

    const vertices =
        rectangleVertices(
            -CABECA_LADO / 2,
            CABECA_BASE,
            CABECA_LADO,
            CABECA_LADO
        );

    return new Float32Array(vertices);
}

function olhosVertices() {

    const vertices = [];

    vertices.push(...rectangleVertices(
        -OLHO_X - OLHO_LADO, OLHO_Y, OLHO_LADO, OLHO_LADO
    ));

    vertices.push(...rectangleVertices(
        OLHO_X, OLHO_Y, OLHO_LADO, OLHO_LADO
    ));

    return new Float32Array(vertices);
}

function bocaVertices() {

    const vertices =
        rectangleVertices(
            -BOCA_LARGURA / 2,
            BOCA_Y,
            BOCA_LARGURA,
            BOCA_ALTURA
        );

    return new Float32Array(vertices);
}

function antenaVertices() {

    const vertices =
        rectangleVertices(
            -ANTENA_LARGURA / 2,
            0.0,
            ANTENA_LARGURA,
            ANTENA_COMPRIMENTO
        );

    return new Float32Array(vertices);
}

function bolinhaVertices() {

    const vertices =
        circleVertices(0.0, 0.0, ANTENA_RAIO, 16);

    return new Float32Array(vertices);
}

function segmentoVertices(largura, comprimento) {

    const vertices = [];

    vertices.push(...rectangleVertices(
        -largura / 2,
        -comprimento,
        largura,
        comprimento
    ));

    vertices.push(...circleVertices(
        0.0, 0.0, largura / 2, 12
    ));

    vertices.push(...circleVertices(
        0.0, -comprimento, largura / 2, 12
    ));

    return new Float32Array(vertices);
}

function peVertices() {

    const vertices =
        rectangleVertices(
            -PE_LARGURA / 2,
            -PE_ALTURA,
            PE_LARGURA,
            PE_ALTURA
        );

    return new Float32Array(vertices);
}


// ==================================================
// CLASSE SCENE OBJECT
// ==================================================

class SceneObject {

    constructor(vertices, color) {

        this.vertices = vertices;

        this.color = color;

        this.modelTransform = m3.identity();
    }

    updateModelTransform(modelTransform) {

        this.modelTransform = modelTransform;
    }
}


// ==================================================
// CLASSE CHAO
// ==================================================

class Chao extends SceneObject {

    constructor() {

        super(
            chaoVertices(),

            COR_CHAO
        );
    }
}


// ==================================================
// CLASSE PARTE
// ==================================================

class Parte extends SceneObject {

    constructor(
        vertices,
        color,
        pivoX = 0.0,
        pivoY = 0.0,
        amplitude = 0.0,
        angularSpeed = 0.0,
        fase = 0.0,
        anguloBase = 0.0
    ) {

        super(vertices, color);

        this.pivoX = pivoX;

        this.pivoY = pivoY;

        this.amplitude = amplitude;

        this.angularSpeed = angularSpeed;

        this.fase = fase;

        this.anguloBase = anguloBase;

        this.theta = anguloBase;

        this.filhos = [];
    }

    adicionar(filho) {

        this.filhos.push(filho);

        return filho;
    }

    updateRotation(tempo) {

        this.theta =
            this.anguloBase +
            this.amplitude *
            Math.sin(this.angularSpeed * tempo + this.fase);

        for (const filho of this.filhos) {

            filho.updateRotation(tempo);
        }
    }

    updateModelTransform(parentTransform) {

        const localTransform =

            m3.multiply(
                m3.translation(this.pivoX, this.pivoY),
                m3.rotation(this.theta)
            );

        this.modelTransform =

            m3.multiply(
                parentTransform,
                localTransform
            );

        for (const filho of this.filhos) {

            filho.updateModelTransform(this.modelTransform);
        }
    }

    draw(renderer) {

        renderer.draw(this);

        for (const filho of this.filhos) {

            filho.draw(renderer);
        }
    }
}


// ==================================================
// CLASSE ROBO
// ==================================================

class Robo {

    constructor(ty) {

        this.ty = ty;

        this.tempo = 0.0;

        this.corpo =
            new Parte(corpoVertices(), COR_CORPO);

        this.corpo.adicionar(
            new Parte(painelVertices(), COR_PAINEL)
        );

        this.montarCabeca();

        this.montarBraco(-OMBRO_X, 0.0, -1.0);

        this.montarBraco(OMBRO_X, Math.PI, 1.0);

        this.montarPerna(-QUADRIL_X, 0.0, -1.0);

        this.montarPerna(QUADRIL_X, Math.PI, 1.0);
    }

    montarCabeca() {

        const cabeca =
            this.corpo.adicionar(
                new Parte(
                    cabecaVertices(), COR_CABECA,
                    0.0, CORPO_ALTURA,
                    0.20, 0.13, 0.0
                )
            );

        cabeca.adicionar(
            new Parte(olhosVertices(), COR_OLHO)
        );

        cabeca.adicionar(
            new Parte(bocaVertices(), COR_BOCA)
        );

        const antenaEsquerda =
            cabeca.adicionar(
                new Parte(
                    antenaVertices(), COR_MEMBRO,
                    -ANTENA_X, CABECA_TOPO,
                    0.45, 0.22, 0.0
                )
            );

        antenaEsquerda.adicionar(
            new Parte(
                bolinhaVertices(), COR_LUZ,
                0.0, ANTENA_COMPRIMENTO
            )
        );

        const antenaDireita =
            cabeca.adicionar(
                new Parte(
                    antenaVertices(), COR_MEMBRO,
                    ANTENA_X, CABECA_TOPO,
                    0.45, 0.19, Math.PI
                )
            );

        antenaDireita.adicionar(
            new Parte(
                bolinhaVertices(), COR_LUZ,
                0.0, ANTENA_COMPRIMENTO
            )
        );
    }

    montarBraco(ombroX, fase, lado) {

        const braco =
            this.corpo.adicionar(
                new Parte(
                    segmentoVertices(
                        BRACO_LARGURA, BRACO_COMPRIMENTO
                    ),
                    COR_MEMBRO,
                    ombroX, OMBRO_Y,
                    1.0, 0.12, fase, lado * 0.35
                )
            );

        braco.adicionar(
            new Parte(
                segmentoVertices(
                    ANTEBRACO_LARGURA, ANTEBRACO_COMPRIMENTO
                ),
                COR_SEGMENTO,
                0.0, -BRACO_COMPRIMENTO,
                0.80, 0.24, fase + Math.PI / 2, lado * 0.50
            )
        );
    }

    montarPerna(quadrilX, fase, lado) {

        const coxa =
            this.corpo.adicionar(
                new Parte(
                    segmentoVertices(
                        COXA_LARGURA, COXA_COMPRIMENTO
                    ),
                    COR_MEMBRO,
                    quadrilX, 0.0,
                    0.22, 0.07, fase, lado * 0.20
                )
            );

        const canela =
            coxa.adicionar(
                new Parte(
                    segmentoVertices(
                        CANELA_LARGURA, CANELA_COMPRIMENTO
                    ),
                    COR_SEGMENTO,
                    0.0, -COXA_COMPRIMENTO,
                    0.18, 0.07, fase + Math.PI / 2, -lado * 0.20
                )
            );

        canela.adicionar(
            new Parte(
                peVertices(), COR_MEMBRO,
                0.0, -CANELA_COMPRIMENTO
            )
        );
    }

    move() {

        this.tempo += 1.0;

        const salto =
            Math.abs(Math.sin(this.tempo * 0.09)) * 0.06;

        const gingado =
            Math.sin(this.tempo * 0.045) * 0.10;

        const roboTransform =

            m3.multiply(
                m3.translation(0.0, this.ty + salto),

                m3.multiply(
                    m3.rotation(gingado),
                    m3.scaling(ESCALA, ESCALA)
                )
            );

        this.corpo.updateRotation(this.tempo);

        this.corpo.updateModelTransform(roboTransform);
    }

    draw(renderer) {

        this.corpo.draw(renderer);
    }
}


// ==================================================
// CLASSE SCENE
// ==================================================

class Scene {

    constructor(gl, program) {

        this.renderer = new Renderer(gl, program);

        this.viewTransform =
            m3.setClippingWindow(-1.33, -1.0, 1.33, 1.0);

        this.renderer.defineViewTransform(this.viewTransform);

        this.chao = new Chao();

        const alturaPerna =
            (COXA_COMPRIMENTO +
             CANELA_COMPRIMENTO +
             PE_ALTURA) * ESCALA;

        this.robo = new Robo(CHAO_Y + alturaPerna);
    }

    update() {

        this.robo.move();
    }

    draw() {

        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(program);

        this.renderer.draw(this.chao);

        this.robo.draw(this.renderer);
    }

    execute() {

        this.update();

        this.draw();

        requestAnimationFrame(() => this.execute());
    }

    init() {

        requestAnimationFrame(() => this.execute());
    }
}


// ==================================================
// CONFIGURAÇÃO INICIAL DO WEBGL
// ==================================================

gl.clearColor(
    0.06,
    0.07,
    0.10,
    1.0
);

gl.viewport(
    0,
    0,
    canvas.width,
    canvas.height
);


// ==================================================
// CRIAR CENA
// ==================================================

const scene = new Scene(gl, program);


// ==================================================
// INICIAR ANIMAÇÃO
// ==================================================

scene.init();
