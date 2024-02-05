const config = {
    datasets: {}
};
const graphs = {};
const tickers = {};

getData();

async function getData() {
    const urls = ["./assets/page-config.json", "./assets/chart-config.json", "./assets/text.json"];
    const keys = ["dashboard", "charts", "text"];
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
                dataURLS.push(`./assets/data/${config.charts[id].dataset}.json`);
                config.datasets[id] = [];
            })
            config.dashboard.tickers.forEach(entry => {
                dataURLS.push('https://public.flourish.studio/visualisation/16565310/visualisation.json') // this assumes we want the same template for all tickers
                config.datasets.ticker = [];
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
                        if (i < jsonObjects.length - 1) config.datasets[config.dashboard.flourish_ids[i]] = obj;
                        else config.datasets.ticker = obj;
                    })
                    console.log('config', config)
                })
                .then(() => {
                    document.querySelector('h1').innerText = config.text.title;
                    if (config.text.intro) document.querySelector('.dashboard-intro').innerText = config.text.intro;
                    if (config.dashboard.input_type === 'dropdown') implementDropdown();
                    // add another to implement buttons
                })
                .then(() => renderIntroVis())
                .then(() => renderVisualisation())
        })
}

function implementDropdown() {
    const label = document.createElement('label');
    label.innerText = config.text.dropdown_label;
    label.for = "dropdown-selection"
    const dropdownEl = document.createElement('select');
    dropdownEl.id = "dropdown-selection";
    const dropdownData = config.text.dropdown.map(entry => entry[config.dashboard.input_filter]);
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
        const selectedValue = evt.target.value;
        updateSummaries(selectedValue);
        updateGraphs(selectedValue);
    })
}

function renderIntroVis() {
    const tickers = config.dashboard.tickers;
    tickers.forEach(entry => {
        const {
            id
        } = entry;
        console.log('id', id, entry);
        const container = document.createElement('div');
        container.id = id;
        container.classList.add('ticker-container');
        document.querySelector('.dashboard-intro').appendChild(container);
        const { state } = config.datasets.ticker;
        console.log('state', state);
        tickers[id] = {};
        tickers[id].opts = {
            template: "@flourish/number-ticker",
            version: 1,
            container: `#${id}`,
            api_url: "/flourish",
            api_key: "", //filled in server side
            base_visualisation_id: '16565310',
            state
        };
        tickers[id].opts.state.custom_template = entry.text.replace('number_to', entry.number_to),
        tickers[id].opts.state.number_from = entry.number_from,
        console.log('opts', tickers[id].opts);
        tickers[id].flourish = new Flourish.Live(tickers[id].opts);
    })
}

function renderVisualisation() {
    const graphIDs = config.dashboard.flourish_ids;
    graphIDs.forEach(id => {
        const container = document.createElement('div');
        container.id = `chart-${id}`;
        container.classList.add('chart-container');
        document.querySelector('.flourish-container').appendChild(container);
        insertChartSummary(id);
        implentGraph(id);
    })
}

function insertChartSummary(id) {
    const currentGraph = config.charts[id];
    if (currentGraph.summary) {
        const summary = document.createElement('p');
        summary.classList.add('chart-summary');
        const summaryTextObj = filterDropdownSummaries(currentGraph.filter_by, config.charts[id].initial_state);
        summary.innerText = summaryTextObj[currentGraph.summary];
        document.querySelector(`#chart-${id}`).appendChild(summary);
    }
}

function updateSummaries(key) {
    const dropdown = document.querySelector('select')
    const selectedText = dropdown[dropdown.selectedIndex].text;
    const summaryTextObj = filterDropdownSummaries(config.dashboard.input_filter, selectedText);

    if (config.dashboard.overall_summary) updateOverallSummary(key, summaryTextObj);
    updateGraphSummaries(key, summaryTextObj);
}

function updateOverallSummary(key, summaryTextObj) {
    document.querySelector('.dashboard-intro').innerText = (summaryTextObj.overall_summary) ? summaryTextObj.overall_summary : 'insert generic sentence here';
}

function updateGraphSummaries(key) {
    const dropdown = document.querySelector('select')
    const selectedText = dropdown[dropdown.selectedIndex].text;
    const graphIDs = config.dashboard.flourish_ids;
    graphIDs.forEach(id => {
        const currentGraph = config.charts[id];
        if (currentGraph.filterable && currentGraph.summary) {
            const filteredData = config.datasets[id].filter(entry => formatName(entry[config.graphs[id].filter_by]) === key);
            const summary = document.querySelector(`#chart-${id} .chart-summary`);
            if (summary) summary.innerText = (filteredData.length <= 0 || !summaryTextObj[currentGraph.summary]) ? `No data available for ${selectedText}` : summaryTextObj[currentGraph.summary];
        }
    });
}

function implentGraph(id) {
    graphs[id] = {};
    graphs[id].opts = {
        template: "@flourish/line-bar-pie",
        version: 25,
        container: `#chart-${id}`,
        api_url: "/flourish",
        api_key: "", //filled in server side
        base_visualisation_id: id,
        bindings: {
            data: {
                label: config.charts[id].x_axis, // this seems to be the X axis
                value: config.charts[id].values, // this is the actual bar
                // facet: "Year",
                // filter: "DataHeader5", // assume this would be for a drop down or something
            }
        },
        data: {
            data: initialData(id),
        },
        state: {
            layout: {
                title: config.charts[id].title.replace('{{country}}', '')
            }
        }
    };
    if (config.charts[id].filterable) {
        graphs[id].opts.bindings.data.metadata = config.charts[id].pop_up; // this is pop ups, can have multiple values
    }
    graphs[id].flourish = new Flourish.Live(graphs[id].opts);
}

function updateGraphs(key) {
    const graphIDs = config.dashboard.flourish_ids;
    graphIDs.forEach(id => {
        const currentGraph = config.charts[id];
        if (currentGraph.filterable) {
            const filteredData = config.datasets[id].filter(entry => formatName(entry[currentGraph.filter_by]) === key);
            if (filteredData.length !== 0) {
                graphs[id].opts.data = {
                    data: filteredData
                };
                const {
                    chart_title_variation_initial,
                    chart_title_variation_filtered,
                    chart_title_flag
                } = config.text;
                const replacementString = key === currentGraph.initial_state.toLowerCase() ? chart_title_variation_initial : chart_title_variation_filtered.replace(chart_title_flag, filteredData[0].Country);
                graphs[id].opts.state.layout.title = currentGraph.title.replace('?', ` ${replacementString}?`)
                graphs[id].flourish.update(graphs[id].opts)
                document.querySelector(`#chart-${id} iframe`).style.opacity = 1;
            } else {
                document.querySelector(`#chart-${id} iframe`).style.opacity = 0.3;
            }
        }
    });
}

function formatName(string) {
    return string.toLowerCase().replace(/ /g, "_");
}

function initialData(id) {
    let data = config.datasets[id];
    if (config.charts[id].filterable) {
        data = config.datasets[id].filter(entry => entry[config.dashboard.input_filter] === config.charts[id].initial_state);
    }
    return data;
}

function filterDropdownSummaries(key, selected) {
    return config.text.dropdown.filter(entry => entry[key] === selected)[0];
}

// Add markdown to html handling for summary text and titles