// ===============================================
// QUERY BUILDER ENGINE (Nested Filters + Groups)
// ===============================================

// Wait for data to load from script.js
document.addEventListener("DOMContentLoaded", () => {
    // Build root group
    const root = createGroup();
    document.getElementById("filterArea").appendChild(root);

    // Populate dropdowns once data is loaded
    setTimeout(() => {
        populateFieldDropdowns();
    }, 300);

    document.getElementById("addFilterBtn").addEventListener("click", () => {
        root.querySelector(".group-children").appendChild(createFilterRow());
        populateFieldDropdowns();
    });

    document.getElementById("runQueryBtn").addEventListener("click", runQuery);
});


// ===============================================
// CREATE GROUP (Card Style)
// ===============================================
function createGroup(operator = "AND") {
    const group = document.createElement("div");
    group.className = "filter-group";
    group.dataset.operator = operator;

    group.innerHTML = `
        <div class="group-header">
            <span>Group (${operator})</span>
            <button class="toggle-operator">AND/OR</button>
            <button class="add-filter">+ Filter</button>
            <button class="add-group">+ Group</button>
            <button class="remove-group">X</button>
        </div>
        <div class="group-children"></div>
    `;

    // Toggle AND/OR
    group.querySelector(".toggle-operator").addEventListener("click", () => {
        group.dataset.operator = group.dataset.operator === "AND" ? "OR" : "AND";
        group.querySelector(".group-header span").textContent = `Group (${group.dataset.operator})`;
    });

    // Add filter
    group.querySelector(".add-filter").addEventListener("click", () => {
        group.querySelector(".group-children").appendChild(createFilterRow());
        populateFieldDropdowns();
    });

    // Add nested group
    group.querySelector(".add-group").addEventListener("click", () => {
        group.querySelector(".group-children").appendChild(createGroup());
    });

    // Remove group
    group.querySelector(".remove-group").addEventListener("click", () => {
        if (group.parentElement.id !== "filterArea") {
            group.remove();
        }
    });

    return group;
}


// ===============================================
// CREATE FILTER ROW
// ===============================================
function createFilterRow() {
    const row = document.createElement("div");
    row.className = "filter-row";

    row.innerHTML = `
        <select class="field-select"></select>
        <select class="operator-select">
            <option value="=">=</option>
            <option value="!=">≠</option>
            <option value=">">></option>
            <option value="<"><</option>
            <option value="contains">contains</option>
        </select>
        <input class="value-input" type="text">
        <button class="remove-filter">X</button>
    `;

    row.querySelector(".remove-filter").addEventListener("click", () => row.remove());

    return row;
}


// ===============================================
// POPULATE FIELD DROPDOWNS
// ===============================================
function populateFieldDropdowns() {
    const fields = Object.keys(inventoryData[0] || {});

    document.querySelectorAll(".field-select").forEach(select => {
        const current = select.value;
        select.innerHTML = fields.map(f => `<option value="${f}">${f}</option>`).join("");
        if (fields.includes(current)) select.value = current;
    });

    // Populate group-by dropdown
    const groupBy = document.getElementById("groupBySelect");
    groupBy.innerHTML = `<option value="">No Grouping</option>` +
        fields.map(f => `<option value="${f}">${f}</option>`).join("");
}


// ===============================================
// BUILD FILTER TREE FROM UI
// ===============================================
function buildFilterTree(groupElement) {
    const operator = groupElement.dataset.operator;
    const children = [];

    groupElement.querySelectorAll(":scope > .group-children > *").forEach(child => {
        if (child.classList.contains("filter-row")) {
            children.push({
                type: "filter",
                field: child.querySelector(".field-select").value,
                op: child.querySelector(".operator-select").value,
                value: child.querySelector(".value-input").value
            });
        } else if (child.classList.contains("filter-group")) {
            children.push(buildFilterTree(child));
        }
    });

    return {
        type: "group",
        operator,
        children
    };
}


// ===============================================
// EVALUATE FILTER TREE
// ===============================================
function evaluateFilter(row, filter) {
    const fieldValue = String(row[filter.field] ?? "").toLowerCase();
    const testValue = String(filter.value).toLowerCase();

    switch (filter.op) {
        case "=": return fieldValue == testValue;
        case "!=": return fieldValue != testValue;
        case ">": return Number(fieldValue) > Number(testValue);
        case "<": return Number(fieldValue) < Number(testValue);
        case "contains": return fieldValue.includes(testValue);
        default: return true;
    }
}

function evaluateNode(node, row) {
    if (node.type === "filter") return evaluateFilter(row, node);
    if (node.type === "group") return evaluateGroup(node, row);
}

function evaluateGroup(group, row) {
    if (group.operator === "AND") {
        return group.children.every(child => evaluateNode(child, row));
    } else {
        return group.children.some(child => evaluateNode(child, row));
    }
}


// ===============================================
// RUN QUERY
// ===============================================
function runQuery() {
    const rootGroup = document.querySelector(".filter-group");
    const filterTree = buildFilterTree(rootGroup);

    let result = inventoryData.filter(row => evaluateNode(filterTree, row));

    // Grouping + Aggregation
    const groupBy = document.getElementById("groupBySelect").value;
    const agg = document.getElementById("aggregateSelect").value;

    if (groupBy) {
        result = groupAndAggregate(result, groupBy, agg);
    }

    renderResults(result);
}


// ===============================================
// GROUP + AGGREGATE
// ===============================================
function groupAndAggregate(data, groupBy, agg) {
    const groups = {};

    data.forEach(row => {
        const key = row[groupBy];
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
    });

    const output = [];

    for (const key in groups) {
        const rows = groups[key];

        let value = 0;
        if (agg === "sum") value = rows.reduce((s, r) => s + (r.QtyCount || 0), 0);
        if (agg === "count") value = rows.length;
        if (agg === "avg") value = rows.reduce((s, r) => s + (r.QtyCount || 0), 0) / rows.length;

        output.push({ [groupBy]: key, Value: value });
    }

    return output;
}


// ===============================================
// RENDER RESULTS
// ===============================================
function renderResults(data) {
    const container = document.getElementById("resultsContainer");
    container.innerHTML = "";

    const type = document.getElementById("chartTypeSelect").value;

    if (type === "table") return renderTable(data, container);
    if (type === "bar") return renderBarChart(data, container);
    if (type === "pie") return renderPieChart(data, container);
    if (type === "line") return renderLineChart(data, container);
    if (type === "card") return renderCard(data, container);
}


// ===============================================
// RENDERERS
// ===============================================
function renderTable(data, container) {
    let html = "<table><tr>";

    Object.keys(data[0]).forEach(k => html += `<th>${k}</th>`);
    html += "</tr>";

    data.forEach(row => {
        html += "<tr>";
        Object.values(row).forEach(v => html += `<td>${v}</td>`);
        html += "</tr>";
    });

    html += "</table>";
    container.innerHTML = html;
}

function renderBarChart(data, container) {
    const keys = Object.keys(data[0]);
    Plotly.newPlot(container, [{
        x: data.map(r => r[keys[0]]),
        y: data.map(r => r[keys[1]]),
        type: "bar"
    }]);
}

function renderPieChart(data, container) {
    const keys = Object.keys(data[0]);
    Plotly.newPlot(container, [{
        labels: data.map(r => r[keys[0]]),
        values: data.map(r => r[keys[1]]),
        type: "pie"
    }]);
}

function renderLineChart(data, container) {
    const keys = Object.keys(data[0]);
    Plotly.newPlot(container, [{
        x: data.map(r => r[keys[0]]),
        y: data.map(r => r[keys[1]]),
        type: "scatter"
    }]);
}

function renderCard(data, container) {
    const value = data[0][Object.keys(data[0])[1]];
    container.innerHTML = `
        <div class="summary-card">
            <h3>Result</h3>
            <p>${value}</p>
        </div>
    `;
}
