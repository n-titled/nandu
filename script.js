document.addEventListener('DOMContentLoaded', () => {
    const cpmBtn = document.getElementById('cpmBtn');
    const pertBtn = document.getElementById('pertBtn');
    const cpmSection = document.getElementById('cpmSection');
    const pertSection = document.getElementById('pertSection');
    const cpmAddTask = document.getElementById('cpmAddTask');
    const pertAddTask = document.getElementById('pertAddTask');
    const cpmCalculate = document.getElementById('cpmCalculate');
    const pertCalculate = document.getElementById('pertCalculate');
    const cpmImport = document.getElementById('cpmImport');
    const pertImport = document.getElementById('pertImport');
    const cpmExport = document.getElementById('cpmExport');
    const pertExport = document.getElementById('pertExport');
    const cpmPDF = document.getElementById('cpmPDF');
    const pertPDF = document.getElementById('pertPDF');

    cpmBtn.addEventListener('click', () => switchTab('cpm'));
    pertBtn.addEventListener('click', () => switchTab('pert'));
    cpmAddTask.addEventListener('click', addCPMTask);
    pertAddTask.addEventListener('click', addPERTTask);
    cpmCalculate.addEventListener('click', calculateCPM);
    pertCalculate.addEventListener('click', calculatePERT);
    cpmImport.addEventListener('click', () => importCSV('cpm'));
    pertImport.addEventListener('click', () => importCSV('pert'));
    cpmExport.addEventListener('click', () => exportCSV('cpm'));
    pertExport.addEventListener('click', () => exportCSV('pert'));
    cpmPDF.addEventListener('click', () => generatePDF('cpm'));
    pertPDF.addEventListener('click', () => generatePDF('pert'));

    document.getElementById('cpmDuration').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addCPMTask();
    });
    document.getElementById('pertPessimistic').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addPERTTask();
    });
});

function switchTab(tab) {
    const cpmBtn = document.getElementById('cpmBtn');
    const pertBtn = document.getElementById('pertBtn');
    const cpmSection = document.getElementById('cpmSection');
    const pertSection = document.getElementById('pertSection');

    if (tab === 'cpm') {
        cpmBtn.classList.add('active');
        pertBtn.classList.remove('active');
        cpmSection.classList.add('active');
        pertSection.classList.remove('active');
    } else {
        cpmBtn.classList.remove('active');
        pertBtn.classList.add('active');
        cpmSection.classList.remove('active');
        pertSection.classList.add('active');
    }
}

function addCPMTask() {
    const activity = document.getElementById('cpmActivity').value;
    const duration = document.getElementById('cpmDuration').value;

    if (activity && duration) {
        const tableBody = document.getElementById('cpmTableBody');
        const newRow = tableBody.insertRow();
        newRow.innerHTML = `
            <td>${activity}</td>
            <td>${duration}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td><button class="delete-btn">-</button></td>
        `;

        newRow.querySelector('.delete-btn').addEventListener('click', () => {
            tableBody.removeChild(newRow);
        });

        document.getElementById('cpmActivity').value = '';
        document.getElementById('cpmDuration').value = '';
        document.getElementById('cpmActivity').focus();
    }
}

function addPERTTask() {
    const activity = document.getElementById('pertActivity').value;
    const optimistic = document.getElementById('pertOptimistic').value;
    const mostLikely = document.getElementById('pertMostLikely').value;
    const pessimistic = document.getElementById('pertPessimistic').value;

    if (activity && optimistic && mostLikely && pessimistic) {
        const tableBody = document.getElementById('pertTableBody');
        const newRow = tableBody.insertRow();
        newRow.innerHTML = `
            <td>${activity}</td>
            <td>${optimistic}</td>
            <td>${mostLikely}</td>
            <td>${pessimistic}</td>
            <td></td>
            <td></td>
            <td><button class="delete-btn">-</button></td>
        `;

        newRow.querySelector('.delete-btn').addEventListener('click', () => {
            tableBody.removeChild(newRow);
        });

        document.getElementById('pertActivity').value = '';
        document.getElementById('pertOptimistic').value = '';
        document.getElementById('pertMostLikely').value = '';
        document.getElementById('pertPessimistic').value = '';
        document.getElementById('pertActivity').focus();
    }
}

function calculateCPM() {
    const tasks = Array.from(document.getElementById('cpmTableBody').rows).map(row => ({
        activity: row.cells[0].textContent,
        duration: parseInt(row.cells[1].textContent),
        est: 0,
        eft: 0,
        lst: 0,
        lft: 0,
        float: 0
    }));

    // Forward pass
    tasks.forEach(task => {
        const [start, end] = task.activity.split('-');
        const predecessors = tasks.filter(t => t.activity.split('-')[1] === start);
        task.est = Math.max(0, ...predecessors.map(p => p.eft));
        task.eft = task.est + task.duration;
    });

    // Backward pass
    const maxEft = Math.max(...tasks.map(t => t.eft));
    tasks.reverse().forEach(task => {
        const [start, end] = task.activity.split('-');
        const successors = tasks.filter(t => t.activity.split('-')[0] === end);
        task.lft = successors.length ? Math.min(...successors.map(s => s.lst)) : maxEft;
        task.lst = task.lft - task.duration;
        task.float = task.lst - task.est;
    });
    tasks.reverse();

    // Update table
    const tableBody = document.getElementById('cpmTableBody');
    tasks.forEach((task, index) => {
        const row = tableBody.rows[index];
        row.cells[2].textContent = task.est;
        row.cells[3].textContent = task.eft;
        row.cells[4].textContent = task.lst;
        row.cells[5].textContent = task.lft;
        row.cells[6].textContent = task.float;
    });

    // Display critical path
    const criticalPath = tasks.filter(task => task.float === 0).map(task => task.activity).join(' -> ');
    document.getElementById('cpmResults').textContent = `Critical Path: ${criticalPath}`;

    // Generate critical path diagram
    generateCPMDiagram(tasks);
}

function calculatePERT() {
    const tasks = Array.from(document.getElementById('pertTableBody').rows).map(row => ({
        activity: row.cells[0].textContent,
        optimistic: parseFloat(row.cells[1].textContent),
        mostLikely: parseFloat(row.cells[2].textContent),
        pessimistic: parseFloat(row.cells[3].textContent)
    }));

    tasks.forEach(task => {
        task.expectedTime = (task.optimistic + 4 * task.mostLikely + task.pessimistic) / 6;
        task.variance = Math.pow((task.pessimistic - task.optimistic) / 6, 2);
    });

    // Update table
    const tableBody = document.getElementById('pertTableBody');
    tasks.forEach((task, index) => {
        const row = tableBody.rows[index];
        row.cells[4].textContent = task.expectedTime.toFixed(2);
        row.cells[5].textContent = task.variance.toFixed(2);
    });

    // Calculate project statistics
    const totalExpectedTime = tasks.reduce((sum, task) => sum + task.expectedTime, 0);
    const totalVariance = tasks.reduce((sum, task) => sum + task.variance, 0);
    const standardDeviation = Math.sqrt(totalVariance);

    document.getElementById('pertResults').innerHTML = `
        Project Expected Duration: ${totalExpectedTime.toFixed(2)}<br>
        Project Variance: ${totalVariance.toFixed(2)}<br>
        Project Standard Deviation: ${standardDeviation.toFixed(2)}
    `;

    // Generate PERT diagram
    generatePERTDiagram(tasks);
}

function generateCPMDiagram(tasks) {
    const width = 800;
    const height = 400;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    const svg = d3.select('#cpmDiagram')
        .html('')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    const nodes = [];
    const links = [];
    const nodeMap = new Map();

    tasks.forEach(task => {
        const [start, end] = task.activity.split('-');
        if (!nodeMap.has(start)) {
            nodeMap.set(start, { id: start, label: start });
            nodes.push(nodeMap.get(start));
        }
        if (!nodeMap.has(end)) {
            nodeMap.set(end, { id: end, label: end });
            nodes.push(nodeMap.get(end));
        }
        links.push({
            source: start,
            target: end,
            value: task.duration,
            isCritical: task.float === 0
        });
    });

    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg.append('g')
        .selectAll('line')
        .data(links)
        .enter().append('line')
        .attr('class', d => d.isCritical ? 'link critical-path' : 'link');

    const node = svg.append('g')
        .selectAll('circle')
        .data(nodes)
        .enter().append('circle')
        .attr('class', 'node')
        .attr('r', 20);

    const label = svg.append('g')
        .selectAll('text')
        .data(nodes)
        .enter().append('text')
        .attr('class', 'node-label')
        .text(d => d.label);

    const linkLabel = svg.append('g')
        .selectAll('text')
        .data(links)
        .enter().append('text')
        .attr('class', 'link-label')
        .text(d => d.value);

    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        node
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);

        label
            .attr('x', d => d.x)
            .attr('y', d => d.y);

        linkLabel
            .attr('x', d => (d.source.x + d.target.x) / 2)
            .attr('y', d => (d.source.y + d.target.y) / 2);
    });
}

function generatePERTDiagram(tasks) {
    // Similar to generateCPMDiagram, but using expected times instead of durations
    // Implement PERT-specific visualization here
}

function importCSV(type) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            const csv = event.target.result;
            const lines = csv.split('\n');
            const tableBody = document.getElementById(type === 'cpm' ? 'cpmTableBody' : 'pertTableBody');
            tableBody.innerHTML = '';
            lines.slice(1).forEach(line => {
                if (line.trim()) {
                    const values = line.split(',');
                    const newRow = tableBody.insertRow();
                    values.forEach(value => {
                        const cell = newRow.insertCell();
                        cell.textContent = value.trim();
                    });
                    const deleteCell = newRow.insertCell();
                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = '-';
                    deleteBtn.className = 'delete-btn';
                    deleteBtn.onclick = () => tableBody.removeChild(newRow);
                    deleteCell.appendChild(deleteBtn);
                }
            });
        };
        reader.readAsText(file);
    };
    input.click();
}

function exportCSV(type) {
    const table = document.getElementById(type === 'cpm' ? 'cpmTable' : 'pertTable');
    let csv = [];
    for (let i = 0; i < table.rows.length; i++) {
        let row = [], cols = table.rows[i].cells;
        for (let j = 0; j < cols.length - 1; j++) {
            row.push(cols[j].innerText);
        }
        csv.push(row.join(','));
    }
    const csvFile = new Blob([csv.join('\n')], { type: 'text/csv' });
    const downloadLink = document.createElement('a');
    downloadLink.download = `${type}_data.csv`;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
}

function generatePDF(type) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.text(`${type.toUpperCase()} Analysis Results`, 10, 10);
    
    const table = document.getElementById(type === 'cpm' ? 'cpmTable' : 'pertTable');
    const results = document.getElementById(type === 'cpm' ? 'cpmResults' : 'pertResults');
    
    doc.autoTable({ html: table });
    doc.text(results.innerText, 10, doc.lastAutoTable.finalY + 10);
    
    // Add diagram to PDF (this is a placeholder, as adding SVG to PDF is complex)
    doc.text('Diagram not included in PDF. Please refer to the web application.', 10, doc.internal.pageSize.height - 20);
    
    doc.save(`${type}_analysis.pdf`);
}