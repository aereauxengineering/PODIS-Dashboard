/******************************************************
 *  PODIS DASHBOARD — UPDATED SCRIPT
 *  New Feature:
 *   ✔ Replace “Total Quantity On Hand” with
 *     “Total Quantity by Type (All Warehouses)”
 *
 *  CSV Columns:
 *  RSA / Warehouse | Parish | Type | Name | Quantity On Hand | ...
 ******************************************************/

// ====================================================
// 1. LOAD CSV + START DASHBOARD
// ====================================================
function loadData() {
    Papa.parse("Data/RSAInventoryReport.csv", {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {

            // Normalize rows (clean headers + convert numbers)
            const data = results.data.map(normalizeRow);

            // Build dashboard components
           renderInventoryCard(data, "GOHSEP Totals", null, "typeTotalsCard");
           renderInventoryCard(data, "Roseland RSA", "Roseland Warehouse", "roselandTotalsCard");
           renderInventoryCard(data, "Camp Minden", "Camp Minden", "mindenTotalsCard");
           renderInventoryCard(data, "Camp Villere", "Camp Villere", "villereTotalsCard");

           /*  buildSummaryCards(data);  */           // Available + Transit
          /*   buildGlobalTypeCards(data);  */        // All warehouses
            populateWarehouseDropdown(data);    // Dropdown + per warehouse
            buildCharts(data);                  // Parish chart
            buildTable(data);                   // Full table
        }
    });
}

document.getElementById("refreshBtn").addEventListener("click", loadData);
loadData();


// ====================================================
// 2. NORMALIZE EACH ROW FROM THE CSV
//    Cleans headers + converts numbers
// ====================================================
function normalizeRow(row) {

    // Clean weird spaces / BOM / hidden characters
    const clean = {};
    Object.keys(row).forEach(key => {
        const cleanedKey = key.replace(/\u00A0/g, " ").trim();
        clean[cleanedKey] = row[key];
    });

    return {
        Warehouse: clean["RSA / Warehouse"] || "",
        Parish: clean["Parish"] || "",
        Type: clean["Type"] || "",
        Name: clean["Name"] || "",
        QtyOnHand: Number(clean["Quantity On Hand"] || 0),
        QtyAllocated: Number(clean["Quantity Allocated To Shipment"] || 0),
        QtyAvailable: Number(clean["Quantity Available"] || 0),
        QtyTransit: Number(clean["Quantity In Transit"] || 0),
        LastInventory: clean["Last Inventory"] || ""
    };
}


// ====================================================
// 3. NEW FEATURE — TOTAL QUANTITY BY TYPE (ALL WAREHOUSES)
//    Replaces the old “Total Quantity On Hand” card
// ====================================================
function renderInventoryCard(data, title, filterValue, elementId) {
    // 1. Filter data (if filterValue is provided, otherwise show all for "GOHSEP Totals")
    const filtered = filterValue ? data.filter(r => r.Warehouse === filterValue) : data;
    
    const typeTotals = {};
    filtered.forEach(row => {
        if (!typeTotals[row.Type]) typeTotals[row.Type] = 0;
        typeTotals[row.Type] += row.QtyOnHand;
    });

    // 2. The standard "Small Card" HTML template
    let html = `
      <div style="border: 1px solid #ddd; border-radius: 8px; padding: 10px; width: 250px; 
                  box-shadow: 0 2px 4px rgba(0,0,0,0.05); font-family: sans-serif; 
                  display: inline-block; vertical-align: top; margin: 10px; background: white;">
        <h3 style="margin-top: 0; font-size: 15px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px; text-align: center;">
            ${title}
        </h3>
        <div style="max-height: 180px; overflow-y: auto;">
          <table style="width:100%; font-size:12px; border-collapse: collapse;">
            <thead>
              <tr style="color: #888; border-bottom: 1px solid #eee;">
                <th style="text-align:left; padding: 4px 0;">Type</th>
                <th style="text-align:right; padding: 4px 0;">Total</th>
              </tr>
            </thead>
            <tbody>
    `;

    Object.keys(typeTotals).sort().forEach(type => {
        html += `
          <tr style="border-bottom: 1px solid #fafafa;">
            <td style="padding: 4px 0;">${type || "(blank)"}</td>
            <td style="text-align:right; font-weight: 600;">${typeTotals[type].toLocaleString()}</td>
          </tr>
        `;
    });

    html += `</tbody></table></div></div>`;
    
    document.getElementById(elementId).innerHTML = html;
}

// --- HOW TO USE IT ---
// Call this one function for every card you need:
renderInventoryCard(data, "GOHSEP Totals", null, "typeTotalsCard");
renderInventoryCard(data, "Roseland RSA", "Roseland Warehouse", "roselandTotalsCard");
renderInventoryCard(data, "Camp Minden", "Camp Minden", "mindenTotalsCard");
renderInventoryCard(data, "Camp Villere", "Camp Villere", "villereTotalsCard");




// ====================================================
// 4. SUMMARY CARDS (Available + Transit ONLY)
// ====================================================
/* function buildSummaryCards(data) {

    const totalAvailable = data.reduce((sum, r) => sum + r.QtyAvailable, 0);
    const totalTransit = data.reduce((sum, r) => sum + r.QtyTransit, 0);

    document.getElementById("card2").innerHTML = `
        <h3>Total Quantity Available</h3>
        <p>${totalAvailable.toLocaleString()}</p>
    `;

    document.getElementById("card3").innerHTML = `
        <h3>Total In Transit</h3>
        <p>${totalTransit.toLocaleString()}</p>
    `;
}
 */

// ====================================================
// 5. GLOBAL TYPE TOTALS (ALL WAREHOUSES)
// ====================================================
/* function buildGlobalTypeCards(data) {
    const typeTotals = {};

    data.forEach(row => {
        if (!typeTotals[row.Type]) typeTotals[row.Type] = 0;
        typeTotals[row.Type] += row.QtyOnHand;
    });

    let html = "";
    Object.keys(typeTotals).sort().forEach(type => {
        html += `
            <div class="card">
                <h3>${type}</h3>
                <p>${typeTotals[type].toLocaleString()}</p>
            </div>
        `;
    });

    document.getElementById("typeSummaryCards").innerHTML = html;
} */


// ====================================================
// 6. POPULATE WAREHOUSE DROPDOWN
// ====================================================
function populateWarehouseDropdown(data) {
    const select = document.getElementById("warehouseSelect");

    const warehouses = [...new Set(data.map(r => r.Warehouse))];

    select.innerHTML = warehouses
        .map(w => `<option value="${w}">${w}</option>`)
        .join("");

    buildWarehouseTypeCards(data, warehouses[0]);

    select.addEventListener("change", () => {
        buildWarehouseTypeCards(data, select.value);
    });
}


// ====================================================
// 7. TYPE TOTALS FOR A SINGLE WAREHOUSE
// ====================================================
function buildWarehouseTypeCards(data, warehouse) {
    const filtered = data.filter(r => r.Warehouse === warehouse);

    const typeTotals = {};

    filtered.forEach(row => {
        if (!typeTotals[row.Type]) typeTotals[row.Type] = 0;
        typeTotals[row.Type] += row.QtyOnHand;
    });

    let html = "";
    Object.keys(typeTotals).sort().forEach(type => {
        html += `
            <div class="card">
                <h3>${type}</h3>
                <p>${typeTotals[type] > 0 ? typeTotals[type].toLocaleString() : "-"}</p>
            </div>
        `;
    });

    document.getElementById("warehouseTypeCards").innerHTML = html;
}


// ====================================================
// 8. CHART — QUANTITY BY PARISH (RESPONSIVE)
// ====================================================
function buildCharts(data) {
    const parishTotals = {};

    data.forEach(row => {
        if (!parishTotals[row.Parish]) parishTotals[row.Parish] = 0;
        parishTotals[row.Parish] += row.QtyOnHand;
    });

    const parishes = Object.keys(parishTotals);
    const totals = Object.values(parishTotals);

    Plotly.newPlot("chart1", [{
        x: parishes,
        y: totals,
        type: "bar",
        marker: { color: "#4f46e5" }
    }], {
        title: "Quantity On Hand by Parish",
        xaxis: { title: "Parish" },
        yaxis: { title: "Quantity On Hand" },
        margin: { t: 40 }
    }, {
        responsive: true
    });
}


// ====================================================
// 9. FULL DATA TABLE
// ====================================================
function buildTable(data) {
    let html = `
        <table>
            <tr>
                <th>Warehouse</th>
                <th>Parish</th>
                <th>Type</th>
                <th>Name</th>
                <th>Qty On Hand</th>
                <th>Qty Allocated</th>
                <th>Qty Available</th>
                <th>Qty In Transit</th>
                <th>Last Inventory</th>
            </tr>
    `;

    data.forEach(r => {
        html += `
            <tr>
                <td>${r.Warehouse}</td>
                <td>${r.Parish}</td>
                <td>${r.Type}</td>
                <td>${r.Name}</td>
                <td>${r.QtyOnHand}</td>
                <td>${r.QtyAllocated}</td>
                <td>${r.QtyAvailable}</td>
                <td>${r.QtyTransit}</td>
                <td>${r.LastInventory}</td>
            </tr>
        `;
    });

    html += `</table>`;
    document.getElementById("tableContainer").innerHTML = html;
}
