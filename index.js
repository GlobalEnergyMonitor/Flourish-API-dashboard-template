console.log('hello 12345');
// https://docs.google.com/spreadsheets/d/e/2PACX-1vST2HEnH9gSQbpcsqJBMWOJZ6vuBtvl4n-PwpxJldD4GzyI_uRZ6hXcYOhkWRo_ZJmA32OfVNUJs99a/pub?gid=0&single=true&output=csv
const temp = '16659638';
const config = {};
getData();

// TO DO: read data from google sheets if poss, currently would need to download data for each vis and convert -> feels like could get unweildy and have performance issues

async function getData() {
    const urls = ["./config.json", "./assets/config.json", "./assets/text.json", "./assets/data_cumulative.json"];
    const keys = ["gem", "dashboard", "text", "data"];
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
        .then(() => {
            if (config.dashboard.input_type === 'dropdown') implementDropdown();
            // add another to implement buttons
        })
        .then(() => renderVisualisation());
}

function implementDropdown() {
    const label = document.createElement('label');
    label.innerText = config.text.dropdown_label;
    label.for = "dropdown-selection"
    const dropdownEl = document.createElement('select');
    dropdownEl.id = "dropdown-selection";
    const dropdownData = config.text.dropdown.map(entry => entry[config.dashboard.input_key]);
    dropdownData.forEach(input => {
        const opt = document.createElement('option');
        opt.value = formatName(input);
        opt.text = input;
        dropdownEl.appendChild(opt);
    })
    const controlsContainer = document.querySelector('.controls-container');
    controlsContainer.appendChild(label);
    controlsContainer.appendChild(dropdownEl);

    dropdownEl.addEventListener('change', (evt) => {
        const selectedCountry = evt.target.value;
        updateGraphs(selectedCountry)
    })
}

function renderVisualisation() {
    const graphs = config.dashboard.flourish_ids;
    [temp].forEach(id => {
        const container = document.createElement('div');
        container.id = `chart-${id}`;
        document.querySelector('.flourish-container').appendChild(container);
        implentGraph(id);
    })
    // console.log('building', config);
}

function implentGraph(id) {
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
    }

    function updateGraphs(country) {
        const filteredData = config.data.filter(entry => formatName(entry.Country) === country);
        console.log(('filter', filteredData));
        console.log((JSON.stringify(filteredData)));

        new Flourish.Live({
                container: `#chart-${temp}`,
                api_key: config.gem.key,
                base_visualisation_id: temp,
                data: {
                    data: filteredData
                }
        });
}

function formatName(string) {
    return string.toLowerCase().replace(/ /g, "_");
}