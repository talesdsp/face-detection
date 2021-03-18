let video

let forwardTimes = []
let predictedAges = []
let withBoxes = true

window.onload = () => {
  video = document.getElementById("video")

  video.addEventListener("play", () => {
    const canvas = faceapi.createCanvasFromMedia(video)
    document.body.append(canvas)
    const displaySize = { width: video.width, height: video.height }
    faceapi.matchDimensions(canvas, displaySize)
    setInterval(async () => {
      const ts = Date.now()
      const detections = await faceapi
        .detectAllFaces(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 128 })
        )
        .withFaceLandmarks()
        .withFaceExpressions()
        .withAgeAndGender()
      // .withFaceDescriptors()

      updateTimeStats(Date.now() - ts)

      const resizedDetections = faceapi.resizeResults(detections, displaySize)
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height)
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections) // draw face lines
      faceapi.draw.drawFaceExpressions(canvas, resizedDetections) // print face expression
      // faceapi.draw.drawDetections(canvas, resizedDetections) // identify faces
      // faceapi.draw.drawDescriptors(canvas, resizedDetections) // print face expression

      // resizedDetections.forEach((detection) => {
      //   console.log(faceapi.draw)
      //   const box = detection.detection.box
      //   const drawBox = new faceapi.draw.DrawBox(box, {
      //     label: Math.round(detection.age) + " year old " + detection.gender,
      //   })
      //   drawBox.draw(canvas)
      // })

      resizedDetections.forEach((detection, i) => {
        const { age, gender, genderProbability } = detection
        // interpolate gender predictions over last 30 frames
        // to make the displayed age more stable
        const interpolatedAge = interpolateAgePredictions(age)

        new faceapi.draw.DrawTextField(
          [
            `${faceapi.utils.round(interpolatedAge, 0)} years`,
            `${gender} (${faceapi.utils.round(genderProbability)})`,
          ],
          detections[i].detection.box.bottomLeft
        ).draw(canvas)
      })
    }, 1000)
  })
}

Promise.all([
  // faceapi.nets.ssdMobilenetv1.loadFromUri("./models"),
  faceapi.nets.tinyFaceDetector.loadFromUri("./models"),
  // faceapi.nets.mtcnn.loadFromUri("./models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("./models"),
  faceapi.nets.faceExpressionNet.loadFromUri("./models"),
  faceapi.nets.ageGenderNet.loadFromUri("./models"),
]).then(startVideo)

function startVideo() {
  navigator.mediaDevices
    .getUserMedia({ video: true, audio: false })
    .then((stream) => {
      video.srcObject = stream
    })
    .catch((err) => console.error(err))
}

function updateTimeStats(timeInMs) {
  forwardTimes = [timeInMs].concat(forwardTimes).slice(0, 30)
  const avgTimeInMs =
    forwardTimes.reduce((total, t) => total + t) / forwardTimes.length
  document.getElementById("time").value = `${Math.round(avgTimeInMs)} ms`
  document.getElementById("fps").value = `${faceapi.utils.round(
    1000 / avgTimeInMs
  )}`
}

function interpolateAgePredictions(age) {
  predictedAges = [age].concat(predictedAges).slice(0, 30)
  const avgPredictedAge =
    predictedAges.reduce((total, a) => total + a) / predictedAges.length
  return avgPredictedAge
}
