
const bigquery = require('@google-cloud/bigquery')();
const vision = require('@google-cloud/vision')();

exports.analyzeImage = function(event) {
	let image = {
		source: {imageUri: event.data.mediaLink}
	};
	return vision.labelDetection(image).then(resp => {
		let labels = resp[0].labelAnnotations.map(l => {
			return {
				description: l.description,
				score: l.score
			};
		});
	const dataset = bigquery.dataset('dataset');
	return dataset.table('images').insert(labels);
	}).catch(err =>{
		console.error(err);
	});
};