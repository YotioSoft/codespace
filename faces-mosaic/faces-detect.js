// cvが読み込まれたときに実行
// cvのinitialize待ち
function onCvLoaded() {
    console.log('on OpenCV.js Loaded', cv);
    
    cv.onRuntimeInitialized = onCVReady();
}

// cvがInitializeされたときに実行
// DOMContentLoaded待ち
function onCVReady() {
    console.log("onCVReady");

    window.addEventListener('DOMContentLoaded', function(){
        document.getElementById("download").onclick = (event) => {
            let canvas = document.getElementById("virtual_canvas");
        
            let link = document.createElement("a");
            link.href = canvas.toDataURL("image/png");
            link.download = "test.png";
            link.click();
        }

        loadCascade();
    });
}

// DOMContentLoaded完了後
// 特徴分類器の読み込み
function loadCascade() {
    // cascadeファイルの読み込み
    let faceCascade = new cv.CascadeClassifier();

    // ファイル入力
    let fileInput = document.getElementById('fileInput');

    // 学習済みデータの読み込み
    // xmlファイルを読み込むので、utilsで読み込んでからcascadeを読み込む必要あり
    faceCascadeFile = './haarcascade_frontalface_default.xml';
    const utils = new Utils('error-message');
    utils.createFileFromUrl(faceCascadeFile, faceCascadeFile, () => {
        faceCascade.load(faceCascadeFile);
    });
        
    // ファイル読み込み完了時の動作
    fileInput.onchange = (e) => {
        onCascadeFileLoaded(cv, e, faceCascade);
    };
}

// 学習済みデータ読込完了後
// 入力画像の読み込みを行う
function onCascadeFileLoaded(cv, e, faceCascade) {
    // 画像読み込み準備
    const image = new Image();
    image.src = URL.createObjectURL(e.target.files[0]);

    image.onload = ()  => {
        detect(cv, image, faceCascade);
    }
}

// 入力画像の読み込み完了後
// 入力画像より顔検出を行い、顔領域を赤枠で囲む
function detect(cv, image, faceCascade) {
    // 画像をcanvas_inputキャンバスに読み込み
    drawMap(image)
            
    // 読み込み完了後：
    // canvas_inputキャンバスからopencvに読み込み
    let cvImage = cv.imread("canvas_input");
    let img_width = cvImage.cols;
    let img_height = cvImage.rows;

    // グレースケール化
    let gray = new cv.Mat();
    cv.cvtColor(cvImage, gray, cv.COLOR_RGBA2GRAY, 0);
    
    // 顔検出
    let faces = new cv.RectVector();
    let msize = new cv.Size(0, 0);
    faceCascade.detectMultiScale(gray, faces, 1.1, 3, 0, msize, msize);

    // 検出した領域にモザイクを表示
    for (let i = 0; i < faces.size(); ++i) {
        mosaic(cvImage, faces.get(i).x, faces.get(i).y, faces.get(i).width, faces.get(i).height);
    }

    // 顔検出結果をcanvas_outputキャンバスに表示
    // output用のキャンバスも同じサイズにする
    canvas_output = document.querySelector('#canvas_output');
    ctx_output = canvas_output.getContext('2d');
    canvas_output.width = img_width;
    canvas_output.height = img_height;
    canvas_output.style.width = img_width + "px";
    canvas_output.style.height = img_height + "px";

    cv.imshow("canvas_output", cvImage);

    // 仮想キャンバスにも適用（ダウンロード用; サイズは元画像と同じ）
    let virtualImage = cv.imread("virtual_canvas");
    virtual_canvas = document.querySelector('#virtual_canvas');
    for (let i = 0; i < faces.size(); ++i) {
        mosaic(virtualImage, faces.get(i).x * (virtual_canvas.width / img_width), faces.get(i).y * (virtual_canvas.width / img_width),
                    faces.get(i).width * (virtual_canvas.width / img_width), faces.get(i).height * (virtual_canvas.width / img_width));
    }
    cv.imshow("virtual_canvas", virtualImage);

    // メモリ解放
    cvImage.delete();
    virtualImage.delete();
    gray.delete();
    faces.delete();
    faceCascade.delete();
}

// 入力画像の描画処理
function drawMap(image) {
    // 仮想キャンバスに画像を描画（画像サイズはそのまま）
    virtual_canvas = document.querySelector('#virtual_canvas');
    virtual_ctx = virtual_canvas.getContext('2d');
    virtual_canvas.width = image.width;
    virtual_canvas.height = image.height;
    virtual_ctx.drawImage(image, 0, 0, image.width, image.height);

    /*--------------------------------------------------*/

    // 表示用キャンバスに画像を描画（画像サイズは縮小）
    canvas_input = document.querySelector('#canvas_input');
    scroller_inner = document.querySelector('#canvas-scroller-input-inner');

    // リサイズ処理（最大: x=1000, y=1000）
    ctx = canvas_input.getContext('2d');
    img = image;
    let width = img.width, height = img.height;
    const max_width = 1000, max_height = 1000;

    if (width > max_width) {
        if (img.width > img.height) {
            height = max_width * img.height / img.width;
            width = max_width;
        } else {
            width = max_height * img.width / img.height;
            height = max_height;
        }
    }
    if (height > max_height) {
        if (img.width > img.height) {
            height = max_width * img.height / img.width;
            width = max_width;
        } else {
            width = max_height * img.width / img.height;
            height = max_height;
        }
    }

    console.log("after width:" + width + ", height:" + height);
    canvas_input.width = width;
    canvas_input.height = height;
    canvas_input.style.width = width;
    canvas_input.style.height = height;
    ctx.canvas.width = width;
    ctx.canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);
}

// モザイクをかける
function mosaic(img, x, y, w, h) {
    // モザイクをかける領域の切り抜き
    let roi = img.roi(new cv.Rect(x, y, w, h));

    // 画像の縮小（5x5に）
    let dst = new cv.Mat();
    let dsize = new cv.Size(5, 5);
    cv.resize(roi, dst, dsize, 0, 0, cv.INTER_AREA);

    // 画像の拡大（元のサイズに）
    let dst2 = new cv.Mat();
    let dsize2 = new cv.Size(w, h);
    cv.resize(dst, dst2, dsize2, 0, 0, cv.INTER_CUBIC);

    // モザイクを元画像に貼り付け
    dst2.copyTo(img.roi(new cv.Rect(x, y, w, h)));

    // 画像の解放
    roi.delete();
    dst.delete();
    dst2.delete();
}
