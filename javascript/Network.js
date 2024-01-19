const scales = {
    betweenness: d3.scaleLinear().range([5, 35]),
    pagerank: d3.scaleLinear().range([5, 35]),
    closeness: d3.scalePow().exponent(1).range([5, 35]),
    degree: d3.scaleLinear().range([5, 35]),
};

const weightScore = [3, 2.979, 2.853, 2.707, 2.612, 2.5, 2.324, 2.186, 2.078, 1];
//const weightScore = [1, 2.078, 2.186, 2.324, 2.5, 2.612, 2.707, 2.853, 2.979, 3];

// 색상 매핑
const colorScale = d3.scaleOrdinal().domain(weightScore).range(['#FF9999', '#FFCC99', '#FFFF99', '#CCFF99', '#99FF99', '#99FFCC', '#99FFFF', '#99CCFF', '#9999FF', '#CC99FF']);

Promise.all([d3.json('data/nodes.json'), d3.json('data/edges_md.json'), d3.json('data/metrics_md.json'), d3.json('data/modified_result_GNN.json')]).then(function ([nodes, edges, metrics, gnn]) {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const svg = d3.select('#svg-container').append('svg').attr('width', '100%').attr('height', '100%');
    const g = svg.append('g');
    const zoom = d3
        .zoom()
        .scaleExtent([0.2, 10])
        .on('zoom', (event) => zoomed(event));

    svg.call(zoom);
    //svg.node().addEventListener('wheel', zoomed, { passive: true });
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.2));

    console.log('Zoom event listener binded');
    //console.log(gnn);
    function zoomed(event) {
        g.attr('transform', event.transform);
    }

    const simulation = d3
        .forceSimulation(nodes)
        .force(
            'link',
            d3
                .forceLink()
                .id((d) => d['본인_id'])
                .distance(40) // 엣지 거리
        )
        .force('charge', d3.forceManyBody())
        .force('charge', d3.forceManyBody().strength(-35))
        .force('center', d3.forceCenter((width * 1) / 2, (height * 1) / 2));
    // .force(
    //     'collide',
    //     d3.forceCollide((d) => scales['closeness'](metrics['closeness'][d['본인_id']]) + 1)
    // );

    const link = g.append('g').attr('class', 'links').selectAll('line').data(edges).enter().append('line').attr('class', 'link');

    const nodeGroup = g.append('g').attr('class', 'nodes').selectAll('g').data(nodes).enter().append('g');

    const opacityScale = d3.scaleLinear().domain([1, 3]).range([0.5, 1]);

    let colorOption;

    const radiusScale = d3.scaleLinear().domain([1, 3]).range([5, 20]);

    const node = nodeGroup
        .append('circle')
        .attr('class', 'node')
        //.attr('r', (d) => (d['본인_관직가중치'] !== null ? radiusScale(d['본인_관직가중치']) : 5))
        .attr('r', (d) => {
            const weight = d['본인_관직가중치'] !== null ? d['본인_관직가중치'] : 1;
            return radiusScale(weight);
        })
        .attr('fill', (d) => {
            const weight = d['본인_관직가중치'] !== null ? d['본인_관직가중치'] : 1;

            if (!colorOption) {
                colorOption = 'weight';
            }

            if (colorOption === 'weight') {
                return colorScale(weight);
            } else if (colorOption === 'sex') {
                if (d['본인_성별'] === 'W') {
                    return 'red';
                } else if (d['본인_성별'] === 'M') {
                    return 'blue';
                } else {
                    return 'gray';
                }
            } else {
                return 'black';
            }
        })
        .attr('id', (d, i) => 'node-' + i)
        .attr('opacity', (d) => {
            const weight = d['본인_관직가중치'] !== null ? d['본인_관직가중치'] : 1;
            const opacityValue = opacityScale(weight);
            d.originalOpacity = opacityValue;
            return opacityValue;
        })
        .call(d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended))
        .on('mouseover', function (event, d) {
            //d3.select('.tooltip').transition().duration(200).style('opacity', 0.9);
            d3.select('.tooltip')
                .html('ID: ' + d['본인_id'] + '<br>' + '이름: ' + d['본인_명'] + '<br>' + '세대: ' + d['본인_세대'] + '<br>' + '촌수: ' + d['촌수'] + '<br>' + '관직 가중치: ' + d['본인_관직가중치'])
                .style('left', event.pageX + 'px')
                .style('top', event.pageY - 28 + 'px');
        })
        .on('mouseout', function (d) {
            d3.select('.tooltip').transition().duration(500).style('opacity', 0);
        });

    weightScore.forEach((score) => {
        const label = document.createElement('label');
        label.innerHTML = `
                <input type='checkbox' class='weightScoreCheckbox' value='${score}' />
                <svg width='12' height='12'>
                    <rect width='11' height='11' rx='2' class='legendrect' style='fill:${colorScale(score)};opacity:0.9;'/>
                </svg>
                가중치: ${score}
            `;

        label.appendChild(document.createElement('br'));
        document.getElementById('chonsu_options_container').appendChild(label);
    });

    let checkedWeights = [];

    d3.selectAll('.weightScoreCheckbox').on('change', function () {
        checkedWeights = d3
            .selectAll('.weightScoreCheckbox:checked')
            .nodes()
            .map((node) => parseFloat(node.value));

        updateNodeAndLabelOpacity();
    });

    function updateNodeAndLabelOpacity() {
        const nodes = d3.selectAll('.node');
        const labels = d3.selectAll('.nodeLabel');

        if (checkedWeights.length > 0) {
            nodes.style('opacity', function (d) {
                const weight = d['본인_관직가중치'] !== null ? d['본인_관직가중치'] : 1;
                return checkedWeights.includes(weight) ? 1 : 0.2;
            });
            labels.style('opacity', function (d) {
                const weight = d['본인_관직가중치'] !== null ? d['본인_관직가중치'] : 1;
                return checkedWeights.includes(weight) ? 1 : 0.2;
            });
        } else {
            nodes.style('opacity', function (d) {
                return d.originalOpacity;
            });
            labels.style('opacity', function (d) {
                return d.originalOpacity;
            });
        }
    }

    function nodeClicked(event, d) {
        d3.select('.tooltip').transition().duration(500).style('opacity', 0);
        d3.selectAll('.highlighted').classed('highlighted', false);

        let connectedNodes = edges.filter((edge) => edge.source === d || edge.target === d).map((edge) => (edge.source === d ? edge.target : edge.source));

        node.style('opacity', 0.2);
        link.style('opacity', 0.2).classed('highlighted', false);
        labels.style('opacity', 0.2);
        updateNodeAndLabelOpacity();
        edges.forEach((edge) => {
            if (edge.source === d || edge.target === d) {
                // 연결된 엣지 강조
                d3.select('#edge-' + edge.index)
                    .classed('highlighted', true)
                    .style('opacity', 1);

                // 연결된 노드 강조
                d3.select('#node-' + edge.source.index).style('opacity', 1);
                d3.select('#node-' + edge.target.index).style('opacity', 1);

                // 연결된 라벨 강조
                d3.select('#label-' + edge.source.index).style('opacity', 1);
                d3.select('#label-' + edge.target.index).style('opacity', 1);
                ㅌ;
            }
        });

        // 클릭된 노드와 라벨 강조
        d3.select(this).style('opacity', 1).classed('highlighted', true);
        labels.filter((label) => label === d).style('opacity', 1);

        updateNodeTable([d].concat(connectedNodes));
        console.log(connectedNodes);
    }

    const capitalize = (s) => {
        if (typeof s !== 'string') return '';
        return s.charAt(0).toUpperCase() + s.slice(1);
    };

    const capitalizeWords = (s) => {
        if (typeof s !== 'string') return '';
        return s
            .split(' ')
            .map((word) => capitalize(word))
            .join(' ');
    };

    const labels = nodeGroup
        .append('text')
        .attr('class', 'nodeLabel')
        .attr('id', (d, i) => 'label-' + i)
        .text((d) => {
            if (!d['본인_영문성'] || !d['본인_영문명']) {
                return d['본인_명'];
            }
            if (/의 딸$/.test(d['본인_명']) || /옹주$|공주$|씨$/.test(d['본인_명'])) {
                return capitalizeWords(' ' + d['본인_영문명']) + ' (' + d['본인_명'] + ')';
            } else {
                return capitalizeWords(d['본인_영문성'] + ' ' + d['본인_영문명']) + ' (' + d['본인_성'] + d['본인_명'] + ')';
            }
        })
        .attr('x', 6)
        .attr('y', 3)
        .attr('opacity', (d) => {
            const originalValue = d['본인_관직가중치'];
            // const opacityValue = originalValue !== null ? opacityScale(originalValue) : 0.3;
            const opacityValue = originalValue !== null ? opacityScale(originalValue) : 0.5;
            d.originalOpacity = opacityValue;
            return opacityValue;
        });

    simulation.nodes(nodes).on('tick', ticked);

    simulation.force('link').links(edges);

    node.on('click', nodeClicked);
    link.attr('id', (d, i) => 'edge-' + i);

    svg.on('click', function (event) {
        if (!event.target.classList.contains('node')) {
            link.style('opacity', 1).classed('highlighted', false);
            node.classed('highlighted', false).style('opacity', function (d) {
                return d.originalOpacity;
            });
            labels.style('opacity', function (d) {
                return d.originalOpacity;
            });

            resetNodeTable();
            updateNodeAndLabelOpacity();
        }
    });

    function computeStatistics(metricValues) {
        if (!metricValues || typeof metricValues !== 'object') {
            console.error('Invalid metricValues:', metricValues);
            return { max: 0, min: 0, mean: 0, median: 0 };
        }
        const values = Object.values(metricValues);
        const max = d3.max(values);
        const min = d3.min(values);
        const mean = d3.mean(values);
        const median = d3.median(values);
        // console.log(max, min, mean, median);
        return { max, min, mean, median };
    }

    const betweennessStats = computeStatistics(metrics['betweenness']);
    const pagerankStats = computeStatistics(metrics['pagerank']);
    const closenessStats = computeStatistics(metrics['closeness']);
    const degreeStats = computeStatistics(metrics['degree']);
    scales.closeness = d3.scalePow().exponent(5).domain([closenessStats.min, closenessStats.max]).range([5, 35]);

    scales.betweenness.domain([betweennessStats.min, betweennessStats.max]);
    scales.pagerank.domain([pagerankStats.min, pagerankStats.max]);
    scales.closeness.domain([closenessStats.min, closenessStats.max]);
    scales.degree.domain([degreeStats.min, degreeStats.max]);

    function updateNodeSize(metric) {
        node.attr('r', function (d) {
            const metricValue = metrics[metric][d['본인_id']] || 0;
            return scales[metric](metricValue);
        });
        simulation.force(
            'collide',
            d3.forceCollide((d) => scales[metric](metrics[metric][d['본인_id']]) + 1)
        );
        simulation.alpha(1).restart();
    }

    nodes.forEach((d) => {
        d.initialRadius = radiusScale(d['본인_관직가중치']) || 5;
    });

    // Update: input GNN Score
    nodes.forEach((node) => {
        const gnnScores = gnn[node['본인_id']];
        if (gnnScores) {
            node['gnnScores'] = gnnScores;
        }
    });

    console.log(nodes);

    function reset() {
        node.attr('r', (d) => d.initialRadius);
        simulation.force('collide', d3.forceCollide(6));
        simulation.alpha(1).restart();
    }

    document.addEventListener('DOMContentLoaded', function () {
        //console.log('DOMContentLoaded event fired'); // Debug Line 1
        var weightOptionSelect = document.getElementById('weightOption');
        weightOptionSelect.value = 'reset';
        weightOptionSelect.dispatchEvent(new Event('change'));
    });

    d3.select('#weightOption').on('change', function () {
        const selectedOption = d3.select(this).property('value');

        // Check if the selected option is a GNN score
        const isGnnScore = ['f_fl', 'f_gf_fl', 'f_gf', 'f_gf_w_fl', 'f_gf_w', 'f', 'f_w_fl', 'f_w', 'fl', 'gf_fl', 'gf', 'gf_w_fl', 'gf_w', 'w_fl', 'w'].includes(selectedOption);

        if (isGnnScore) {
            // If it's a GNN score, update the node size based on the GNN score
            updateNodeSizeBasedOnGnnScore(selectedOption);
            updateTableBasedOnWeight(nodes, selectedOption);
        } else {
            // If it's not a GNN score, it must be a weight option or reset
            let metric = null;
            switch (selectedOption) {
                case 'betweenness':
                    metric = 'betweenness';
                    updateNodeSize('betweenness');
                    break;
                case 'pagerank':
                    metric = 'pagerank';
                    updateNodeSize('pagerank');
                    break;
                case 'closeness':
                    metric = 'closeness';
                    updateNodeSize('closeness');
                    break;
                case 'degree':
                    metric = 'degree';
                    updateNodeSize('degree');
                    break;
                case 'reset':
                    reset();
                    resetMetrics();
                    //updateTableBasedOnWeight(nodes);
                    updateTableBasedOnWeight(nodes, '본인_관직가중치');
                    return; // Return early since we don't need to update metrics after reset
                default:
                    console.error('Unknown option selected');
                    return; // Return early for an unknown option
            }
            updateTableBasedOnWeight(nodes, selectedOption);
            if (metric) {
                updateMetricStatistics(metric);
                updateTable(metric, nodes);
            }
        }
    });

    function updateNodeSizeBasedOnGnnScore(gnnScoreKey) {
        nodes.forEach((node) => {
            //console.log('Key:', gnnScoreKey, 'Value:', node.gnnScores[gnnScoreKey]);

            const gnnScoreValue = node.gnnScores && node.gnnScores[gnnScoreKey] != null ? node.gnnScores[gnnScoreKey] : 0;
            const newRadius = gnnScoreValue === 0 ? 5 : radiusScale(gnnScoreValue / 100);
            node.radius = newRadius;
            node.currentGnnScore = gnnScoreValue;
        });

        node.attr('r', (d) => d.radius);
        //updateTableBasedOnWeight(nodes);

        simulation.force(
            'collide',
            d3.forceCollide().radius((d) => d.radius + 1)
        );
        simulation.alpha(1).restart();
    }

    function updateTableBasedOnWeight(nodes, weightKey) {
        const tableData = nodes.map((d) => {
            let name;
            if (/의 딸$/.test(d['본인_명']) || /옹주$|공주$|씨$/.test(d['본인_명'])) {
                name = d['본인_명'];
            } else {
                name = d['본인_성'] + d['본인_명'];
            }

            let score = d.gnnScores[weightKey] != null ? d.gnnScores[weightKey] / 100 : d['본인_관직가중치'];

            return {
                // id: d['본인_id'],
                name: name,
                origin: d['본인_본관'],
                score: score,
            };
        });

        tableData.sort((a, b) => b.score - a.score);

        const table = d3.select('#container_section_right').select('table');
        let tbody = table.select('tbody');
        if (tbody.empty()) {
            tbody = table.append('tbody');
        }

        const rows = tbody.selectAll('tr').data(tableData);

        rows.enter()
            .append('tr')
            .merge(rows)
            .html((d) => `<td>${d.name}</td><td>${d.origin}</td><td>${d.score.toFixed(2)}</td>`); // 가중치를 출력

        rows.exit().remove();
    }

    function updateNodeTable(nodes) {
        d3.select('#node_info_table tbody').remove();

        // 새로운 테이블 데이터 추가
        let tbody = d3.select('#node_info_table').append('tbody');

        nodes.forEach((node) => {
            let name;
            if (/의 딸$/.test(node['본인_명']) || /옹주$|공주$|씨$/.test(node['본인_명'])) {
                name = node['본인_명'];
            } else {
                name = node['본인_성'] + node['본인_명'];
            }

            let score = node['본인_관직가중치'] !== null ? node['본인_관직가중치'] : 1;

            let row = tbody.append('tr');
            // row.append('td').text(node['본인_id']);
            row.append('td').text(name);
            row.append('td').text(node['본인_본관']);
            row.append('td').text(score);
        });
    }

    function resetNodeTable() {
        d3.select('#node_info_table tbody').remove();
    }

    function updateTable(metric, nodes) {
        const tableData = nodes.map((d) => {
            let name;
            if (/의 딸$/.test(d['본인_명']) || /옹주$|공주$|씨$/.test(d['본인_명'])) {
                name = d['본인_명'];
            } else {
                name = d['본인_성'] + d['본인_명'];
            }
            return {
                // id: d['본인_id'],
                name: name,
                origin: d['본인_본관'],
                score: metrics[metric][d['본인_id']] || 0,
            };
        });

        tableData.sort((a, b) => b.score - a.score);

        const table = d3.select('#container_section_right').select('table');

        let tbody = table.select('tbody');
        if (tbody.empty()) {
            tbody = table.append('tbody');
        }

        const rows = tbody.selectAll('tr').data(tableData);

        rows.enter()
            .append('tr')
            .merge(rows)
            .html((d) => `<td>${d.name}</td><td>${d.origin}</td><td>${d.score.toFixed(2)}</td>`);

        rows.exit().remove();
    }
    //칼라 옵션
    d3.select('#colorOption').on('change', function () {
        colorOption = d3.select(this).node().value;

        node.attr('fill', (d) => {
            if (colorOption === 'weight') {
                return colorScale(d['본인_관직가중치']);
            } else if (colorOption === 'sex') {
                if (d['본인_성별'] === 'W') {
                    return 'red';
                } else if (d['본인_성별'] === 'M') {
                    return 'blue';
                } else {
                    return 'gray';
                }
            } else {
                return 'black';
            }
        });
    });

    function updateMetricStatistics(metricName) {
        d3.select('#selected_metric_name').text('Selected Metric: ' + metricName);
        const stats = computeStatistics(metrics[metricName]);

        d3.select('#max_value').text('Max: ' + stats.max);
        d3.select('#min_value').text('Min: ' + stats.min);
        d3.select('#mean_value').text('Mean: ' + stats.mean.toFixed(2));
        d3.select('#median_value').text('Median: ' + stats.median);
    }

    function resetMetrics() {
        d3.select('#selected_metric_name').text('Selected Metric: Default');
        d3.select('#max_value').text('Max: ');
        d3.select('#min_value').text('Min: ');
        d3.select('#mean_value').text('Mean: ');
        d3.select('#median_value').text('Median: ');
    }

    function ticked() {
        link.attr('x1', (d) => d.source.x)
            .attr('y1', (d) => d.source.y)
            .attr('x2', (d) => d.target.x)
            .attr('y2', (d) => d.target.y);

        node.attr('cx', (d) => d.x).attr('cy', (d) => d.y);

        labels.attr('x', (d) => d.x).attr('y', (d) => d.y);
    }

    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
});
