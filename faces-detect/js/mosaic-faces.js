// 入力画像の描画処理
function drawMap(image) {
    // 仮想キャンバスに画像を描画（画像サイズはそのまま）
    virtual_canvas = document.querySelector('#virtual-canvas');
    virtual_ctx = virtual_canvas.getContext('2d');
    virtual_canvas.width = image.width;
    virtual_canvas.height = image.height;
    virtual_ctx.drawImage(image, 0, 0, image.width, image.height);

    /*--------------------------------------------------*/

    // 表示用キャンバスに画像を描画（画像サイズは縮小）
    canvas_input = document.querySelector('#img-input');
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

// cvが読み込まれたときに実行
function onCvLoaded() {
    console.log('on OpenCV.js Loaded', cv);
    
    cv.onRuntimeInitialized = onCVReady();
}

// cvがInitializeされたときに実行
function onCVReady() {
    console.log("onCVReady");

    window.addEventListener('DOMContentLoaded', function(){
        document.getElementById("download").onclick = (event) => {
            let canvas = document.getElementById("virtual-canvas");
        
            let link = document.createElement("a");
            link.href = canvas.toDataURL("image/png");
            link.download = "test.png";
            link.click();
        }

        load_cascade();
    });
}

// 特徴分類器の読み込み
function load_cascade() {
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
        // 画像読み込み準備
        const image = new Image();
        image.src = URL.createObjectURL(e.target.files[0]);

        image.onload = ()  => {
            // 画像をimg-inputキャンバスに読み込み
            drawMap(image)
            
            // 読み込み完了後：
            // img-inputキャンパスからopencvに読み込み
            let cvImage = cv.imread("img-input");
            let img_width = cvImage.cols;
            let img_height = cvImage.rows;

            // グレースケール化
            let gray = new cv.Mat();
            cv.cvtColor(cvImage, gray, cv.COLOR_RGBA2GRAY, 0);
            
            // 顔検出
            let faces = new cv.RectVector();
            let msize = new cv.Size(0, 0);
            faceCascade.detectMultiScale(gray, faces, 1.1, 3, 0, msize, msize);

            // 検出した領域に赤枠を表示
            for (let i = 0; i < faces.size(); ++i) {
                let point1 = new cv.Point(faces.get(i).x, faces.get(i).y);
                let point2 = new cv.Point(faces.get(i).x + faces.get(i).width, faces.get(i).y + faces.get(i).height);
                cv.rectangle(cvImage, point1, point2, [255, 0, 0, 255], 2);
            }

            // 顔検出結果をimg-outputキャンバスに表示
            // output用のキャンバスも同じサイズにする
            canvas_output = document.querySelector('#img-output');
            ctx_output = canvas_output.getContext('2d');
            canvas_output.width = img_width;
            canvas_output.height = img_height;
            canvas_output.style.width = img_width + "px";
            canvas_output.style.height = img_height + "px";

            cv.imshow("img-output", cvImage);

            // 仮想キャンバスにも適用（ダウンロード用; サイズは元画像と同じ）
            let virtualImage = cv.imread("virtual-canvas");
            virtual_canvas = document.querySelector('#virtual-canvas');
            for (let i = 0; i < faces.size(); ++i) {
                let point1 = new cv.Point(faces.get(i).x * (virtual_canvas.width / img_width), faces.get(i).y * (virtual_canvas.height / img_height));
                let point2 = new cv.Point((faces.get(i).x + faces.get(i).width) * (virtual_canvas.width / img_width), (faces.get(i).y + faces.get(i).height) * (virtual_canvas.height / img_height));
                cv.rectangle(virtualImage, point1, point2, [255, 0, 0, 255]);
            }
            cv.imshow("virtual-canvas", virtualImage);

            // メモリ解放
            cvImage.delete();
            virtualImage.delete();
            gray.delete();
            faces.delete();
            faceCascade.delete();
        }
    };
}
