


console.log('hello 12345');
// https://docs.google.com/spreadsheets/d/e/2PACX-1vST2HEnH9gSQbpcsqJBMWOJZ6vuBtvl4n-PwpxJldD4GzyI_uRZ6hXcYOhkWRo_ZJmA32OfVNUJs99a/pub?gid=0&single=true&output=csv


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
    console.log('length', config.dashboard['flourish-ids']);
    const graphs = config.dashboard['flourish-ids'];
    graphs.forEach(id => {
        const container = document.createElement('div');
        container.id = `chart-${id}`;
        document.querySelector('.flourish-container').appendChild(container);
        new Flourish.Live({
            container: `#chart-${id}`,
            api_key: config.gem.key,
            base_visualisation_id: id
            // state: {
            //     layout: {
            //         title: config.text.title,
            //         source_name: "I am a source",
            //     },
            //     y: {
            //         linear_max: 100
            //     }
            // }
        });
    })
    // console.log('building', config);
}
