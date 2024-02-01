


console.log('hello');

const config = {};

async function getData() {
    const urls = ["./config.json", "./assets/config.json", "./assets/text.json"];
    const keys = ["gem", "dashboard", "text"];
    const promises = [];
    for (const url of urls) {
      promises.push(fetch(url));
    }
    
    Promise.all(promises)
        .then(responses => Promise.all(responses.map(r => r.json())))
        .then(jsonObjects => {
            jsonObjects.forEach((obj, i) => {
                config[keys[i]] = obj;
            })
            console.log('config', config)
        })
        .then(() => renderVisualisation());
}

getData();

function renderVisualisation() {
    console.log('building', config);
    var my_visualization = new Flourish.Live({
        container: "#chart-1",
        api_key: config.gem.key,
        base_visualisation_id: config.dashboard['flourish-ids'][0],
        state: {
            layout: {
                title: config.text.title,
                source_name: "I am a source",
            },
            y: {
                linear_max: 100
            }
        }
    });
}
