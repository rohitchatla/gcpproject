
//cloud functions

//resizing
const functions = require('firebase-functions')
const { Storage } = require('@google-cloud/storage');
const projectId = 'gcpproject-271606';
let gcs = new Storage ({
  projectId
});
const os = require('os');
const path = require('path');
const spawn = require("child-process-promise").spawn;

//http,realtime database changes
const cors = require("cors")({ origin: true });
const Busboy = require("busboy");
const fs = require("fs");

//for pubsub(cloud_function)
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);



exports.onFileChange = functions.storage.object().onFinalize((event,context) => {
  console.log(event);
  //const object = event.data;
  const bucket = event.bucket;
  const contentType = event.contentType;
  const filePath = event.name;
  console.log("File change detected, function execution started");

  /*if (object.resourceState === "not_exists") {
    console.log("We deleted a file, exit...");
    return;
  }*/

  if (path.basename(filePath).startsWith("resized-")) {
    console.log("We already renamed that file!");
    return;
  }

  const destBucket = gcs.bucket(bucket);
  const tmpFilePath = path.join(os.tmpdir(), path.basename(filePath));
  const metadata = { contentType: contentType };
  return destBucket
    .file(filePath)
    .download({
      destination: tmpFilePath
    })
    .then(() => {
      return spawn("convert", [tmpFilePath, "-resize", "500x500", tmpFilePath]);
    })
    .then(() => {
      return destBucket.upload(tmpFilePath, {
        destination: "resized-" + path.basename(filePath),
        metadata: metadata
      });
    });

});



exports.onDataAdded = functions.database.ref('/message/{id}').onCreate((event,context) => {
  console.log('event: ' + event)
  const data = event.val();
  const newData = {
    msg: data.msg.toUpperCase()//event.params.id + '-' + data.msg.toUpperCase()
  };
  return event.ref.child('copiedData').set(newData) //return event.ref.parent.child('copiedData').set(newData)
});













exports.sendNotificationToTopic = functions.firestore.document('puppies/{uid}').onWrite(async (event) => {
    //let docID = event.after.id;
    let title = event.after.get('title');
    let content = event.after.get('content');
    var message = {
        notification: {
            title: title,
            body: content,
        },
        topic: 'testtopic',
    };

    let response = await admin.messaging().send(message);
    console.log(response);
});

exports.sendNotificationToFCMToken = functions.firestore.document('messages/{mUid}').onWrite(async (event) => {
    const uid = event.after.get('userUid');
    const title = event.after.get('title');
    const content = event.after.get('content');
    let userDoc = await admin.firestore().doc(`users/${uid}`).get();
    let fcmToken = userDoc.get('fcm');

    var message = {
        notification: {
            title: title,
            body: content,
        },
        token: fcmToken,
    }

    let response = await admin.messaging().send(message);
    console.log(response);
});