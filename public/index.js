const converter = new showdown.Converter();
const config = {
    datasets: {}
};
const graphs = {};
const tickers = {
    options: []
};

getData();

async function getData() {
    const urls = ["./assets/page-config.json", "./assets/chart-config.json", "./assets/text-config.json"];
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
                dataURLS.push(`./assets/data/${config.dashboard.ticker_data}.json`)
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
                        if (config.dashboard.tickers) {
                            if (i < jsonObjects.length - 2) {
                                config.datasets[config.dashboard.flourish_ids[i]] = obj;
                            }
                            else {
                                if (obj.template && obj.template === '@flourish/number-ticker') config.datasets.ticker.flourish_template = obj;
                                else config.datasets.ticker.data = obj;
                            }
                        }
                        else config.datasets[config.dashboard.flourish_ids[i]] = obj;
                    })
                })
                .then(() => {
                    document.querySelector('h1').innerHTML = markdownToHTML(config.text.title);
                    if (config.text.intro) document.querySelector('.dashboard-intro--para').innerHTML = markdownToHTML(config.text.intro);
                    if (config.dashboard.input_type === 'dropdown') implementDropdown();
                    if (config.dashboard.input_type === 'buttons') implementFilterButtons();
                    if (config.text.footer) document.querySelector('.dashboard-footer').innerHTML = markdownToHTML(config.text.footer);
                    // add another to implement combo
                })
                .then(() => renderTickers())
                .then(() => renderVisualisation())
                .catch((error) => {
                    console.error(error);
                });
        })
}

function implementDropdown() {
    if (!config.text.dropdown_label) throw new Error('input_label not found or does not match input type. Check page and text configs');
    const label = document.createElement('label');
    label.innerHTML = markdownToHTML(config.text.dropdown_label);
    label.for = "dropdown-selection"
    const dropdownEl = document.createElement('select');
    dropdownEl.id = "dropdown-selection";

    if (!config.text.dropdown) throw new Error('page-config specifies input of dropdown but text-config does not match')

    let dropdownData = (typeof config.dashboard.input_filter === 'string') ? 
        config.text.dropdown.map(entry => entry[config.dashboard.input_filter])
        : config.dashboard.input_filter;
    
    dropdownData.forEach(input => {
        const opt = document.createElement('option');
        opt.value = formatName(input);
        opt.text = input;
        dropdownEl.appendChild(opt);
    });

    const controlsContainer = document.querySelector('.controls-container');
    controlsContainer.appendChild(label);
    controlsContainer.appendChild(dropdownEl);
    controlsContainer.classList.add('controls-container--dropdown');

    dropdownEl.addEventListener('change', (evt) => {
        const selectedValue = evt.target.value;
        updateSummaries(selectedValue);
        updateGraphs(selectedValue);
    })
}

function implementFilterButtons() {
    if (!config.text.buttons_label) throw new Error('input_label not found or does not match input type. Check page and text configs')
    const label = document.createElement('legend');
    label.innerHTML = markdownToHTML(config.text.buttons_label);
    label.for = "button-group"
    const btnGroup = document.createElement('fieldset');
    btnGroup.classList.add('button-group');
    btnGroup.appendChild(label);

    btnsWrapper = document.createElement('div');
    btnsWrapper.classList.add('buttons-wrapper');
    btnGroup.appendChild(btnsWrapper);

    if (!config.text.buttons) throw new Error('page-config specifies input of buttons but text-config does not match')

    let buttonData = (typeof config.text.dropdown === 'string') ? 
        config.text.buttons.map(entry => entry[config.dashboard.input_filter])
        : config.dashboard.input_filter;

    buttonData.forEach((button, i) => {
        const btnContainer = document.createElement('div');
        btnContainer.classList.add('filter-button');

        const btn = document.createElement('input');
        btn.type = 'radio';
        if (i === 0) btn.checked = "checked";
        // btn.classList.add('filter-button');
        btn.value = formatName(button);
        btn.id = formatName(button);
        btn.text = button;
        btn.name = 'filter';
        const label = document.createElement('label');
        label.innerHTML = button;
        label.for = formatName(button);

        btnContainer.appendChild(label);
        btnContainer.appendChild(btn);
        btnsWrapper.appendChild(btnContainer);
    });
    const controlsContainer = document.querySelector('.controls-container');
    controlsContainer.appendChild(btnGroup);
    controlsContainer.classList.add('controls-container--buttons');

    const buttonEls = document.querySelectorAll('.filter-button input');
    buttonEls.forEach(btn => {
        btn.addEventListener('click', (evt) => {
            buttonEls.forEach(btnEl => btnEl.checked = false);
            evt.target.checked = "checked";

            const selectedValue = evt.target.value;
            updateSummaries(selectedValue);
            updateGraphs(selectedValue);
        })
    });
}

function renderTickers() {
    if (config.dashboard.tickers) {
        const container = document.createElement('div');
        container.classList.add('tickers-container');
        document.querySelector('.dashboard-intro').appendChild(container);
        const initialData = initialTickerData()[0];

        const { state } = config.datasets.ticker.flourish_template;
        if (config.dashboard["ticker_text_font-size"]) {
            const tickerTextSplit = config.dashboard["ticker_text_font-size"]
            .match(/[a-zA-Z]+|[0-9]+(?:\.[0-9]+)?|\.[0-9]+/g); // grab text size from config and split into size and unit needed in flourish:
            state.font_size = tickerTextSplit[0];
            state.font_unit = tickerTextSplit[1]
        }

        const options = {
            template: "@flourish/number-ticker",
            version: '1.5.1',
            api_url: "/flourish",
            api_key: "", //filled in server side
            state: {
                ...state
            }
        };

        config.dashboard.tickers.forEach((entry, i) => {
            const { id } = entry;
            const container = document.createElement('div');
            container.id = id;
            container.classList.add('ticker-container');
            document.querySelector('.tickers-container').appendChild(container);

            const tickerConf = config.dashboard.tickers.filter( entry => entry.id === id)[0];
            tickers[id] = {};
            tickers[id].options = {
                ...options,
                container: `#${id}`,
                state: {
                    ...options.state,
                    custom_template: formatWithTickerStyling(initialData, id),
                    value_format: {
                        ...options.state.value_format,
                        n_dec: tickerConf.decimal_places,
                    }
                }
            }
            tickers[id].flourish = new Flourish.Live(tickers[id].options);
            tickers[id].flourish.iframe.style.width = "100%"; // needed to override full width in safari
        });
    }
}

function updateTickers() {
    config.dashboard.tickers.forEach((entry, i) => {
        const { id } = entry;
        const data = filterTickerData(getSelectedText());
        if (data[id]) {
            tickers[id].options.state.custom_template = formatWithTickerStyling(data, id)
            tickers[id].flourish.update(tickers[id].options)
            document.querySelector(`#${id} iframe`).style.opacity = 1;
        }
        else document.querySelector(`#${id} iframe`).style.opacity = 0.3;
    });
}

function formatWithTickerStyling(data, id) {
    const text = data[id];
    const { style } = config.dashboard.tickers.filter( entry => entry.id === id)[0];
    const colourOverride = data[`${id}_color`];
    const styledSpan =  Object.entries(style).reduce((prev, [key, val]) => `${prev} ${key}: ${(key === 'color' && colourOverride) ? colourOverride : val};`, '<span style="') + '">';
    return text.replace('<span>', styledSpan);
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
        const summaryTextObj = filterSummaries(currentGraph.filter_by, config.charts[id].initial_state);
        summary.innerHTML = markdownToHTML(summaryTextObj[currentGraph.summary]);
        document.querySelector(`#chart-${id}`).appendChild(summary);
    }
}

function updateSummaries(key) {
    const summaryTextObj = filterSummaries(config.dashboard.input_filter, getSelectedText());

    if (config.dashboard.overall_summary) updateOverallSummary(summaryTextObj);
    if (config.dashboard.tickers) updateTickers(key);
    updateGraphSummaries(key, summaryTextObj);
}

function updateOverallSummary(summaryTextObj) {
    document.querySelector('.dashboard-intro--para').innerHTML = 
        markdownToHTML((summaryTextObj.overall_summary) ? summaryTextObj.overall_summary : '');
}

function updateGraphSummaries(key, summaryTextObj) {
    const graphIDs = config.dashboard.flourish_ids;
    graphIDs.forEach(id => {
        const currentGraph = config.charts[id];
        if (currentGraph.filterable && currentGraph.summary) {
            const filteredData = config.datasets[id].filter(entry => formatName(entry[currentGraph.filter_by]) === key);
            const summary = document.querySelector(`#chart-${id} .chart-summary`);
            if (summary) {
                summary.innerHTML = markdownToHTML(
                    (filteredData.length <= 0 || !summaryTextObj[currentGraph.summary]) ? 
                    config.text.no_data.replace("{{selected}}", summaryTextObj[config.dashboard.input_filter]) : summaryTextObj[currentGraph.summary]);
            }
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
            }
        },
        data: {
            data: initialData(id),
        },
        state: {
            layout: {
                title: config.charts[id].title.replace('{{country}}', ''),
                subtitle: config.charts[id].subtitle,
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

            let filteredData;
            if (typeof config.charts[id].filter_by === 'string') {
                filteredData = config.datasets[id].filter(entry => formatName(entry[currentGraph.filter_by]) === key);
            }
            else {
                if (getUnformattedInputName(key) === 'All') filteredData = config.datasets[id];
                else filteredData = filterDataOnColumnName(key, id);
            }

            if (filteredData.length !== 0) {
                graphs[id].opts.data = {
                    data: filteredData
                };
                // const replacementString = key === currentGraph.initial_state.toLowerCase() ? chart_title_variation_initial : chart_title_variation_filtered.replace(chart_title_flag, filteredData[0].Country);
                // graphs[id].opts.state.layout.title = currentGraph.title.replace('', ` ${replacementString}?`)
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

function getUnformattedInputName(string) {
    let output = '';
    config.dashboard.input_filter.forEach(key => {
        if (formatName(key) === string) output = key;
    })
    return output;
}

function initialData(id) {
    let data = config.datasets[id];
    if (config.charts[id].filterable) {
        if (typeof config.charts[id].filter_by === 'string') {
            data = config.datasets[id].filter(entry => entry[config.dashboard.input_filter] === config.charts[id].initial_state);
        }
        else {
            const defaultFilter = config.dashboard.input_default;
            if (defaultFilter === "All") return data;
            else return filterDataOnColumnName(formatName(defaultFilter), id)
        }
    }
    return data;
}

function filterDataOnColumnName(key, id) {
    const filterValue = getUnformattedInputName(key);
    const x_value = config.charts[id].x_axis;
    filteredData = config.datasets[id].map(entry => {
        let output = {};
        output[filterValue] = entry[filterValue];
        output[x_value] = entry[x_value];
        return output;
    });
    return filteredData;
}

function initialTickerData() {
    return config.datasets.ticker.data.filter(entry => entry[config.dashboard.input_filter] === config.dashboard.input_default);
}

function filterSummaries(key, selected) {
    return config.text[(config.dashboard.input_type === 'dropdown') ? 'dropdown' : 'buttons'].filter(entry => entry[key] === selected)[0];
}

function filterTickerData(key) {
    return config.datasets.ticker.data.filter(entry => entry[config.dashboard.input_filter] === key)[0];
}

function getSelectedText() {
    if (config.dashboard.input_type === 'dropdown') {
        const dropdown = document.querySelector('select');
        return dropdown[dropdown.selectedIndex].text;
    }
    else if (config.dashboard.input_type === 'buttons') {
        const selectedButton = document.querySelector('input[name="filter"]:checked');
        return selectedButton.text;
    }
}

function getSelectedButton() {
    const dropdown = document.querySelector('select');
    return dropdown[dropdown.selectedIndex].text;
}

function markdownToHTML(string) {
    return converter.makeHtml(string).replace(/<\/?p[^>]*>/g, '');;
}
