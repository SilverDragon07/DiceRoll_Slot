import * as THREE from "./public/threejs-121/build/three.module.js";
import {OrbitControls} from "./public/threejs-121/examples/jsm/controls/OrbitControls.js";
import {WEBGL} from "./public/threejs-121/examples/jsm/WebGL.js";
import {FBXLoader} from './public/threejs-121/examples/jsm/loaders/FBXLoader.js'


// WebGL2 が使えるかどうかのチェック
if ( WEBGL.isWebGL2Available() === false ) {
    document.body.appendChild( WEBGL.getWebGL2ErrorMessage() );
}


//グローバル関数
var scene;
var renderer;
var camera;
var light;
var controls;
var diceModel;
var dices = [];

var gridSize = 11;
var gridScale = 200;
var gridObject;

var highScore = 0;
var nowScore = 0;

//全体の流れ
init_three();
init_camera();
init_lights();
load_model();
init_control();
renderf();

animate();


//threejsの初期化
function init_three()
{
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2");

    renderer = new THREE.WebGLRenderer({
        canvas: canvas
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth * 5 / 6, window.innerHeight * 5 / 6);

    document.body.appendChild(renderer.domElement);
    window.addEventListener("resize", onWindowResize, false);

    scene = new THREE.Scene();
    scene.background = new THREE.Color("rgb(40, 0, 80)");   
}


//カメラの初期化
function init_camera()
{
    const fov = 45;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 5000;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(500, 500, 3000);
}

//ライトの初期化
function init_lights()
{
    light = new THREE.DirectionalLight(0xFFFFFF);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);
}



//---------------------------
//          モデル関係
//---------------------------

//モデルの読み込み
function load_model()
{
    const diceLoader = new FBXLoader();
    diceLoader.load('./src/Dice.fbx', (fbx)=>
    {
        diceModel = fbx;
        createPlayerDice();
    })
}

//---------------------------
//          モデル関係
//---------------------------



//コントロールの初期化
function init_control()
{
    controls = new OrbitControls( camera, renderer.domElement );
    controls.addEventListener( 'change', renderf );
    document.addEventListener( 'keydown', onDocumentKeyDown);
}

//ウィンドウサイズが変化した時呼ばれる関数
function onWindowResize() 
{
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth * 5 / 6, window.innerHeight * 5 / 6);
    renderf();
}

// レンダリングだけする関数
function renderf() 
{
    renderer.render( scene, camera );
}

//キー入力を受け取る関数
function onDocumentKeyDown(event)
{
    const key = event.key;

    if(key != null)
    {
        switch(key)
        {
            //ダイスを止める
            case 'Enter':
            case 'Return':
                var breakFlag = false;          //一個止めたらbreakする為のフラグ
                dices.forEach((obj)=>
                {
                    if(breakFlag)
                    {
                        return;
                    }
                    if(obj.requestStopFlag == false)
                    {
                        obj.stop();
                        breakFlag = true;
                    }
                })
                break;
            
            //ダイスをリセットする
            case 'r':
               dices.forEach((obj)=>
               {
                    obj.reset();
                    resetText();
               })
        }
    }
}

//動かすダイスを生成する関数
function createPlayerDice()
{
    for(var x = -800; x <= 800; x += 400)
    {   
        dices.push(new Dice(x, 100, 0));
    }

    gridObject = new THREE.GridHelper(gridSize * gridScale, gridSize);      //1グリッドの大きさ, 分割数
    scene.add(gridObject);
}

//毎フレーム呼び出される関数
function animate()
{
    dices.forEach((obj)=>
    {
        obj.rotate();
        if(obj.ableToMoveFlag)
            obj.setTargetRotation(90);
    })

    renderf();
    requestAnimationFrame(animate);
}

//html上のテキストを更新する関数
function updateText(n)
{
    var text = document.getElementById("Result").text;
    var tempNum = parseInt(text);
    document.getElementById("Result").text = tempNum + n;

    nowScore += n;
    console.log(nowScore, highScore);
    if(nowScore > highScore)
    {
        document.getElementById("HighScore").text = nowScore;
        highScore = nowScore;
    }
}

//html上のテキストをリセットする関数
function resetText()
{
    document.getElementById("Result").text = 0;
    nowScore = 0;
}


//ダイスのクラス
class Dice extends THREE.Object3D
{
    scale = 1.0
    nowRotationX = 0.0
    nowRotationY = 0.0
    nowRotationZ = 0.0
    targetRotationX = 0.0
    targetRotationY = 0.0
    targetRotationZ = 0.0
    rotationSpeed = 15

    positionX = 0
    positionY = 100
    positionZ = 0

    _ableToMoveFlag = true
    allStopFlag = false;
    requestStopFlag = false

    constructor(x, y, z)
    {
        super();

        this.positionX = x;
        this.positionY = y;
        this.positionZ = z;


        this.mesh = diceModel.clone();
        this.mesh.scale.set(this.scale, this.scale, this.scale);
        this.mesh.position.set(this.positionX, this.positionY, this.positionZ);

        scene.add(this.mesh);
        renderf();
    }

    get ableToMoveFlag()
    {
        return this._ableToMoveFlag;
    }
    set ableToMoveFlag(f)
    {
        this._ableToMoveFlag = f;
    }

    setTargetRotation(x, y, z)
    {
        this.targetRotationX += x;
        this.targetRotationY += y;
        this.targetRotationZ += z;

        this.ableToMoveFlag = false;
    }

    //毎フレーム呼び出される関数
    rotate()
    {
        if(!this.allStopFlag)
        {
            const moveRate = 0.1;
            const rotRate = this.rotationSpeed * Math.PI / 180;
            var moveCheckFlagX = false;
            var moveCheckFlagY = false;

            //縦回転
            if(parseInt(this.nowRotationX) < parseInt(this.targetRotationX))
            {
                this.mesh.rotateX(rotRate);
                this.nowRotationX += this.rotationSpeed;
            }
            else if (parseInt(this.nowRotationX) > parseInt(this.targetRotationX))
            {
                this.mesh.rotateX(-rotRate);
                this.nowRotationX -= this.rotationSpeed;
            }
            else
            {
                moveCheckFlagX = true;
            }

            //横回転
            if(parseInt(this.nowRotationZ) < parseInt(this.targetRotationZ))
            {
                this.mesh.rotateZ(rotRate);
                this.nowRotationZ += this.rotationSpeed;
            }
            else if (parseInt(this.nowRotationZ) > parseInt(this.targetRotationZ))
            {
                this.mesh.rotateZ(-rotRate);
                this.nowRotationZ -= this.rotationSpeed;
            }
            else
            {
                moveCheckFlagY = true;
            }

            //縦横共に目標の角度になっている時の処理
            if(moveCheckFlagX && moveCheckFlagY)
            {
                this.ableToMoveFlag = true;

                if(this.requestStopFlag)
                {
                    this.allStopFlag = true;

                    switch(this.nowRotationX)
                    {
                        //4の目
                        case 0:
                        case 360:
                            updateText(4);
                            break;
                        //1の目
                        case 90:
                            updateText(1);
                            break;
                        //3の目
                        case 180:
                            updateText(3);
                            break;
                        //6の目
                        case 270:
                            updateText(6);
                            break;
                    }
                }
            }

            //角度が360を超えたら360引いて正しくする
            if(this.nowRotationX > 360)
                this.nowRotationX -= 360
            else if(this.nowRotationX < -360)
                this.nowRotationX += 360

            if(this.targetRotationX > 360)
                this.targetRotationX -= 360
            else if(this.targetRotationX < -360)
                this.targetRotationX += 360 

            if(this.nowRotationZ > 360)
                this.nowRotationZ -= 360
            else if(this.nowRotationZ < 360)
                this.nowRotationZ += 360

            if(this.targetRotationZ > 360)
                this.targetRotationZ -= 360
            else if(this.targetRotationZ < 360)
                this.targetRotationZ += 360
        }
    }

    //ダイスの回転を止めるリクエストをする関数
    stop()
    {
        this.requestStopFlag = true;
    }

    //ダイスの回転を再び始める関数
    reset()
    {
        this.requestStopFlag = false;
        this.allStopFlag = false;
    }

}




