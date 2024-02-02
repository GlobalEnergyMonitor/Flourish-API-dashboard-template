// https://docs.google.com/spreadsheets/d/e/2PACX-1vST2HEnH9gSQbpcsqJBMWOJZ6vuBtvl4n-PwpxJldD4GzyI_uRZ6hXcYOhkWRo_ZJmA32OfVNUJs99a/pub?gid=0&single=true&output=csv
// const temp = '16659864';
const config = {
    datasets: {}
};
const graphs = {};
const dataset = {

}
getData();

// TO DO: read data from google sheets if poss, currently would need to download data for each vis and convert -> feels like could get unweildy and have performance issues

async function getData() {
    const urls = ["./assets/config.json", "./assets/text.json"];
    const keys = ["dashboard", "text"];
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
        })
        .then(() => {
            const dataURLS = [];
            config.dashboard.flourish_ids.forEach(id => {
                dataURLS.push(`./assets/data/${config.dashboard[id].dataset}.json`);
                config.datasets[id] = [];
            })
            const fetches = [];
            for (const url of dataURLS) {
                fetches.push(fetch(url));
            }
            Promise.all(fetches)
                .then(responses => {
                    console.log('res', responses);
                    return Promise.all(responses.map(r => r.json()))
                })
                .then(jsonObjects => {
                    console.log('obj', jsonObjects)
                    jsonObjects.forEach((obj, i) => {
                        config.datasets[config.dashboard.flourish_ids[i]] = obj;
                    })
                    console.log('config', config)
                })
                .then(() => {
                    if (config.dashboard.input_type === 'dropdown') implementDropdown();
                    // add another to implement buttons
                })
                .then(() => renderVisualisation())
                .then(() => updateGraphs('global'));
        })
}

function implementDropdown() {
    const label = document.createElement('label');
    label.innerText = config.text.dropdown_label;
    label.for = "dropdown-selection"
    const dropdownEl = document.createElement('select');
    dropdownEl.id = "dropdown-selection";
    const dropdownData = config.text.dropdown.map(entry => entry[config.dashboard.filter_key]);
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
    const graphIDs = config.dashboard.flourish_ids;
    graphIDs.forEach(id => {
        const container = document.createElement('div');
        container.id = `chart-${id}`;
        container.classList.add('chart-container');
        document.querySelector('.flourish-container').appendChild(container);
        console.log('id', id, config.dashboard[id].title);
        implentGraph(id);
    })
    // console.log('building', config);
}

function implentGraph(id) {
    graphs[id] = {};
    graphs[id].opts = {
        container: `#chart-${id}`,
        api_key: process.env.API_KEY,
        base_visualisation_id: id,
        bindings: {
            data: {
                label: config.dashboard[id].x_axis, // this seems to be the X axis
                value: config.dashboard[id].bar_values, // this is the actual bar
                // facet: "Year",
                // filter: "DataHeader5", // assume this would be for a drop down or something
            }
        },
        data: {
            data: initialData(id),
        },
        state: {
            layout: {
                title: config.dashboard[id].title.replace('{{country}}', '')
            }
        }
    };
    if (config.dashboard[id].filterable) {
        graphs[id].opts.bindings.data.metadata = config.dashboard[id].pop_up; // this is pop ups, can have multiple values
    }
    graphs[id].flourish = new Flourish.Live(graphs[id].opts);
}

function updateGraphs(key) {
    const graphIDs = config.dashboard.flourish_ids;
    graphIDs.forEach(id => {
        if (config.dashboard[id].filterable) {
            const filteredData = config.datasets[id].filter(entry => formatName(entry[config.dashboard.filter_key]) === key);
            graphs[id].opts.data = {
                data: filteredData
            };
            const { title_variation_initial, title_variation_filtered, title_flag } = config.text;
            const replacementString = key === config.dashboard[id].initial_state.toLowerCase() ? title_variation_initial : title_variation_filtered.replace(title_flag, filteredData[0].Country);
            graphs[id].opts.state.layout.title = config.dashboard[id].title.replace('?', ` ${replacementString}?`)
            graphs[id].flourish.update(graphs[id].opts)    
            // add check - if no data to update to, show some sort of overlay to show no data / reduce opacity / default to global
            if (filteredData.length === 0) {

            }
        }
    });
}

function formatName(string) {
    return string.toLowerCase().replace(/ /g, "_");
}

function initialData(id) {
    let data = config.datasets[id];
    if (config.dashboard[id].filterable) {
        data = config.datasets[id].filter(entry => entry[config.dashboard.filter_key] === config.dashboard[id].initial_state);
    }
    return data;
}