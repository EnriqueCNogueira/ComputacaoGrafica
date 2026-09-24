// ==================================================
// PARÂMETROS DO VOO
// ==================================================

// Tamanho do helicóptero na tela
const HELICOPTER_SCALE = 0.5;

// Inclinação fixa da "câmera" para enxergar o disco do rotor principal
const VIEW_ANGLE = 0.35;

// Velocidade máxima de deslocamento (unidades de clip space por segundo)
const MAX_SPEED = 0.8;

// Quão rápido a velocidade atual alcança a velocidade desejada (1/s)
const ACCELERATION = 4.0;

// Inclinação máxima do helicóptero ao voar para os lados (rad)
const MAX_TILT = 0.25;

// Velocidade angular do rotor principal (rad/s)
const ROTOR_IDLE_SPEED = 7.0;   // pairando
const ROTOR_CLIMB_BOOST = 5.0;  // extra ao subir
const ROTOR_DESCENT_CUT = 3.0;  // redução ao descer
const ROTOR_CRUISE_BOOST = 2.0; // extra ao voar para os lados

// O rotor de cauda é ligado mecanicamente ao principal e gira mais rápido.
// Razão reduzida em relação a um helicóptero real (~5x) para evitar o
// efeito estroboscópico a 60 fps.
const TAIL_ROTOR_RATIO = 1.6;

// Centro do rotor de cauda na geometria (eixo de rotação paralelo a z)
const TAIL_ROTOR_CENTER_X = 0.7;
const TAIL_ROTOR_CENTER_Y = 0.0;

// Limites da posição para o helicóptero não sair do canvas
const LIMIT_X = 0.5;
const LIMIT_Y_MIN = -0.8;
const LIMIT_Y_MAX = 0.6;

// ==================================================
// FUNÇÕES AUXILIARES
// ==================================================

function clamp(value, min, max) {

    return Math.min(Math.max(value, min), max);
}

// Aproxima "current" de "target" de forma suave e independente do fps
function approach(current, target, rate, dt) {

    return current + (target - current) * Math.min(1.0, rate * dt);
}

// ==================================================
// CLASS - SCENE
// ==================================================

class Scene {

    constructor(gl, program) {

        this.renderer =
            new Renderer(gl, program);

        // Partes do helicóptero
        this.helicopterBody = new HelicopterBody();

        this.helicopterTopShaft = new HelicopterTopShaft();

        this.helicopterTail = new HelicopterTail();

        this.helicopterPropellers = new HelicopterPropellers();

        this.helicopterTailPropeller = new HelicopterTailPropeller();

        // Estado do voo
        this.position = { x: 0.0, y: 0.0 };
        this.velocity = { x: 0.0, y: 0.0 };
        this.tilt = 0.0;

        // Estado das hélices
        this.rotorSpeed = ROTOR_IDLE_SPEED;
        this.mainRotorAngle = 0.0;
        this.tailRotorAngle = 0.0;

        // Teclas pressionadas no momento
        this.pressedKeys = new Set();

        this.lastTime = null;

        this.bindKeyboard();
    }

    // ==================================================
    // TECLADO
    // ==================================================

    bindKeyboard() {

        const arrows = [
            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight"
        ];

        window.addEventListener("keydown", (event) => {

            if (arrows.includes(event.key)) {
                // Evita rolar a página com as setas
                event.preventDefault();
                this.pressedKeys.add(event.key);
            }
        });

        window.addEventListener("keyup", (event) => {

            this.pressedKeys.delete(event.key);
        });

        // Ao trocar de janela o keyup não chega, então solta todas as teclas
        window.addEventListener("blur", () => {

            this.pressedKeys.clear();
        });
    }

    // Direção pedida pelo teclado: -1, 0 ou 1 em cada eixo
    inputDirection() {

        const keys = this.pressedKeys;

        return {
            x: (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0),
            y: (keys.has("ArrowUp") ? 1 : 0) - (keys.has("ArrowDown") ? 1 : 0)
        };
    }

    // ==================================================
    // ATUALIZAÇÃO
    // ==================================================

    updateFlight(dt) {

        const direction = this.inputDirection();

        // Velocidade desejada, normalizada na diagonal
        const length = Math.hypot(direction.x, direction.y) || 1.0;
        const targetVx = MAX_SPEED * direction.x / length;
        const targetVy = MAX_SPEED * direction.y / length;

        this.velocity.x = approach(this.velocity.x, targetVx, ACCELERATION, dt);
        this.velocity.y = approach(this.velocity.y, targetVy, ACCELERATION, dt);

        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;

        // Ao bater na borda, para naquele eixo
        const clampedX = clamp(this.position.x, -LIMIT_X, LIMIT_X);
        const clampedY = clamp(this.position.y, LIMIT_Y_MIN, LIMIT_Y_MAX);

        if (clampedX !== this.position.x) this.velocity.x = 0.0;
        if (clampedY !== this.position.y) this.velocity.y = 0.0;

        this.position.x = clampedX;
        this.position.y = clampedY;

        // O disco do rotor inclina para o lado do deslocamento
        // (ângulo positivo em z leva o topo para -x)
        const targetTilt = -MAX_TILT * this.velocity.x / MAX_SPEED;

        this.tilt = approach(this.tilt, targetTilt, ACCELERATION, dt);
    }

    updateRotors(dt) {

        // Fração da velocidade máxima em cada sentido
        const climb = Math.max(this.velocity.y, 0.0) / MAX_SPEED;
        const descent = Math.max(-this.velocity.y, 0.0) / MAX_SPEED;
        const cruise = Math.abs(this.velocity.x) / MAX_SPEED;

        const targetSpeed =
            ROTOR_IDLE_SPEED +
            ROTOR_CLIMB_BOOST * climb -
            ROTOR_DESCENT_CUT * descent +
            ROTOR_CRUISE_BOOST * cruise;

        // O rotor tem inércia: acelera e desacelera aos poucos
        this.rotorSpeed = approach(this.rotorSpeed, targetSpeed, 2.0, dt);

        const fullTurn = 2.0 * Math.PI;

        this.mainRotorAngle =
            (this.mainRotorAngle + this.rotorSpeed * dt) % fullTurn;

        this.tailRotorAngle =
            (this.tailRotorAngle + this.rotorSpeed * TAIL_ROTOR_RATIO * dt) % fullTurn;
    }

    update(dt) {

        this.updateFlight(dt);
        this.updateRotors(dt);

        // Transformação do helicóptero inteiro:
        // inclinação lateral -> inclinação da câmera -> escala -> posição.
        // A escala negativa em z converte o sistema da geometria (frente em +z)
        // para o clip space do WebGL (mais perto em -z).
        let helicopterTransform = m4.zRotation(this.tilt);
        helicopterTransform = m4.xRotate(helicopterTransform, VIEW_ANGLE);
        helicopterTransform = m4.scale(
            helicopterTransform,
            HELICOPTER_SCALE,
            HELICOPTER_SCALE,
            -HELICOPTER_SCALE
        );
        helicopterTransform = m4.translate(
            helicopterTransform,
            this.position.x,
            this.position.y,
            0.0
        );

        // Rotor principal: gira em torno do eixo y (que passa pela haste)
        const mainRotorTransform = m4.multiply(
            helicopterTransform,
            m4.yRotation(this.mainRotorAngle)
        );

        // Rotor de cauda: leva o centro para a origem, gira em z, devolve
        let tailRotorLocal = m4.translation(
            -TAIL_ROTOR_CENTER_X,
            -TAIL_ROTOR_CENTER_Y,
            0.0
        );
        tailRotorLocal = m4.zRotate(tailRotorLocal, this.tailRotorAngle);
        tailRotorLocal = m4.translate(
            tailRotorLocal,
            TAIL_ROTOR_CENTER_X,
            TAIL_ROTOR_CENTER_Y,
            0.0
        );

        const tailRotorTransform = m4.multiply(
            helicopterTransform,
            tailRotorLocal
        );

        this.helicopterBody.update(helicopterTransform);
        this.helicopterTopShaft.update(helicopterTransform);
        this.helicopterTail.update(helicopterTransform);
        this.helicopterPropellers.update(mainRotorTransform);
        this.helicopterTailPropeller.update(tailRotorTransform);
    }

    draw() {

        const gl = this.renderer.gl;

        gl.clear(
            gl.COLOR_BUFFER_BIT |
            gl.DEPTH_BUFFER_BIT
        );

        gl.useProgram(this.renderer.program);

        this.helicopterBody.draw(
            this.renderer
        );

        this.helicopterTopShaft.draw(
            this.renderer
        );

        this.helicopterTail.draw(
            this.renderer
        );

        this.helicopterPropellers.draw(
            this.renderer
        );

        this.helicopterTailPropeller.draw(
            this.renderer
        );
    }

    execute(time) {

        // Tempo entre quadros em segundos, limitado para não "teleportar"
        // quando a aba volta do segundo plano
        const dt = this.lastTime === null
            ? 0.0
            : Math.min((time - this.lastTime) / 1000.0, 0.05);

        this.lastTime = time;

        this.update(dt);
        this.draw();

        requestAnimationFrame(
            (nextTime) => this.execute(nextTime)
        );
    }

    init() {

        requestAnimationFrame(
            (time) => this.execute(time)
        );
    }
}
