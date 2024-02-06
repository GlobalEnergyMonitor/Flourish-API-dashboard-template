const config = {
    datasets: {}
};
const graphs = {};
const tickers = {
    options: []
};

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
            if (config.dashboard.tickers) {
                dataURLS.push('https://public.flourish.studio/visualisation/16565310/visualisation.json') // this assumes we want the same template for all tickers
                dataURLS.push('./assets/data/data_ticker-demo.json') // can we specify the name this file always has to have?
                config.datasets.ticker = {};
            }
            const fetches = [];
            for (const url of dataURLS) {
                fetches.push(fetch(url));
            }
            Promise.all(fetches)
                .then(responses => {
                    return Promise.all(responses.map(r => r.json()))
                })
                .then(jsonObjects => {
                    jsonObjects.forEach((obj, i) => {
                        if (i < jsonObjects.length - 2) { // TODO: make this not hard coded
                            config.datasets[config.dashboard.flourish_ids[i]] = obj;
                        }
                        else {
                            if (obj.template && obj.template === '@flourish/number-ticker') config.datasets.ticker.flourish_template = obj;
                            else config.datasets.ticker.data = obj;
                        }
                    })
                })
                .then(() => {
                    document.querySelector('h1').innerText = config.text.title;
                    if (config.text.intro) document.querySelector('.dashboard-intro--para').innerText = config.text.intro;
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
    // TODO: checks for no tickers / error handling
    // Are the only intro vis types tickers?
    const container = document.createElement('div');
    container.classList.add('tickers-container');
    document.querySelector('.dashboard-intro').appendChild(container);

    const { state } = config.datasets.ticker.flourish_template;
    const options = {
        template: "@flourish/number-ticker",
        version: '1.5.1',
        api_url: "/flourish",
        api_key: "", //filled in server side
        state: {
            ...state,
            font_size: 2.5,
            font_unit: 'rem'
        }
    };
    // TODO: get font size and colour from config

    config.dashboard.tickers.forEach((entry, i) => {
        const { id } = entry;
        const container = document.createElement('div');
        container.id = id;
        container.classList.add('ticker-container');
        document.querySelector('.tickers-container').appendChild(container);
        
        tickers[id] = {};
        tickers[id].options = {
            ...options,
            container: `#ticker-${i+1}`,
            state: {
                ...options.state,
                custom_template: config.dashboard.tickers[i].text
                .replace('{{color}}', config.dashboard.tickers[i].style.color)
                .replace('number_to', config.dashboard.tickers[i].number_to)
            }
            // pull all styling variations from config
        }
        tickers[id].flourish = new Flourish.Live(tickers[id].options);
    })
}

function updateIntroVis() {
    // TODO: checks for no tickers / error handling
    config.dashboard.tickers.forEach((entry, i) => {
        const { id } = entry;
        const number_to = filterTickers(getDropdownText())[id];

        tickers[id].options.state.custom_template= config.dashboard.tickers[i].text
                .replace('{{color}}', config.dashboard.tickers[i].style.color)
                .replace('number_to', number_to);
        tickers[id].flourish.update(tickers[id].options)
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
    const summaryTextObj = filterDropdownSummaries(config.dashboard.input_filter, getDropdownText());

    if (config.dashboard.overall_summary) updateOverallSummary(key, summaryTextObj);
    updateIntroVis(key);
    updateGraphSummaries(key, summaryTextObj);
}

function updateOverallSummary(key, summaryTextObj) {
    document.querySelector('.dashboard-intro--para').innerText = (summaryTextObj.overall_summary) ? summaryTextObj.overall_summary : 'insert generic sentence here';
}

function updateGraphSummaries(key) {
    const graphIDs = config.dashboard.flourish_ids;
    graphIDs.forEach(id => {
        const currentGraph = config.charts[id];
        if (currentGraph.filterable && currentGraph.summary) {
            const filteredData = config.datasets[id].filter(entry => formatName(entry[config.graphs[id].filter_by]) === key);
            const summary = document.querySelector(`#chart-${id} .chart-summary`);
            if (summary) summary.innerText = (filteredData.length <= 0 || !summaryTextObj[currentGraph.summary]) ? `No data available for ${getDropdownText()}` : summaryTextObj[currentGraph.summary];
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

function filterTickers(key) {
    return config.datasets.ticker.data.filter(entry => entry[config.dashboard.input_filter] === key)[0];
}

function getDropdownText() {
    const dropdown = document.querySelector('select');
    return dropdown[dropdown.selectedIndex].text;
}

// TODO: Add markdown to html handling for summary text and titles