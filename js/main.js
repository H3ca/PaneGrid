
document.addEventListener("DOMContentLoaded", () => {

    // 1️⃣ Grab all DOM elements
    const paneCountInput = document.getElementById("paneCount");
    const paneInputsContainer = document.getElementById("paneInputs");
    const paneInputsWrapper = document.getElementById("paneInputsWrapper");
    const drawBtn = document.getElementById("drawBtn");
    const canvas = document.getElementById("previewCanvas");
    const ctx = canvas.getContext("2d");

    // 2️⃣ Generate pane inputs dynamically
    function generatePaneInputs() {
        const count = parseInt(paneCountInput.value);
        paneInputsContainer.innerHTML = "";

        for (let i = 0; i < count; i++) {
            const label = document.createElement("label");
            label.textContent = `Pane ${i + 1}`;
            label.className = "form-label mt-2";

            const input = document.createElement("input");
            input.type = "number";
            input.placeholder = "Width";
            input.value = 200;
            input.className = "form-control mb-1";

            paneInputsContainer.appendChild(label);
            paneInputsContainer.appendChild(input);
        }

        // Auto-scroll to bottom if needed
        paneInputsWrapper.scrollTop = paneInputsWrapper.scrollHeight;
    }

    paneCountInput.addEventListener("change", generatePaneInputs);
    generatePaneInputs(); // call once on page load

    // 3️⃣ Read pane widths
    function getPaneWidths() {
        const inputs = paneInputsContainer.querySelectorAll("input");
        return Array.from(inputs).map(input => parseFloat(input.value));
    }

    // 4️⃣ Validate wall
    function validateWall(wallWidth, panes) {
        const total = panes.reduce((sum, w) => sum + w, 0);
        if (total !== wallWidth) {
            alert("Pane widths must equal wall width!");
            return false;
        }
        return true;
    }

    // 5️⃣ Canvas helper functions
    function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function getScaleFactor(wallWidth, wallHeight) {
        const scaleX = canvas.width / wallWidth;
        const scaleY = canvas.height / wallHeight;
        return Math.min(scaleX, scaleY);
    }

    function drawWallBackground(wall) {
        const scale = Math.min(canvas.width / wall.width, canvas.height / wall.height);
        const wallWidthPx = wall.width * scale;
        const wallHeightPx = wall.height * scale;

        ctx.fillStyle = "#cce6ff";
        ctx.fillRect(0, 0, wallWidthPx, wallHeightPx);

        ctx.strokeStyle = "#007bff";
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, wallWidthPx, wallHeightPx);

        return scale;
    }

    function drawPanes(wall, panes) {
        const scale = Math.min(canvas.width / wall.width, canvas.height / wall.height);
        let x = 0;
        panes.forEach(paneWidth => {
            const w = paneWidth * scale;
            const h = wall.height * scale;

            ctx.fillStyle = "rgba(200, 230, 255, 0.7)";
            ctx.fillRect(x, 0, w, h);

            ctx.strokeStyle = "#007bff";
            ctx.lineWidth = 2;
            ctx.strokeRect(x, 0, w, h);

            x += w;
        });
    }

    function drawPattern(wall, panes) {
        const scale = Math.min(canvas.width / wall.width, canvas.height / wall.height);
        const wallWidthPx = wall.width * scale;
        const wallHeightPx = wall.height * scale;

        const circleDiameter = parseFloat(document.getElementById("patternSize").value);
        const spacingX = parseFloat(document.getElementById("patternXSpacing").value);
        const spacingY = parseFloat(document.getElementById("patternYSpacing").value);
        const userOffset = parseFloat(document.getElementById("patternOffset").value); // can be negative
        const floorOffset = parseFloat(document.getElementById("FloorOffset").value);

        const circleDiameterPx = circleDiameter * scale;
        const spacingPx = spacingX * scale;
        const floorOffsetPx = floorOffset * scale;

        // Offset for first circle
        const offsetPx = userOffset * scale;

        // Vertical center
        const cy = wallHeightPx - floorOffsetPx;

        ctx.fillStyle = "#ff0000";

        // Clip drawing to wall width
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, wallWidthPx, wallHeightPx);
        ctx.clip();

        const paneEdges = [0];
        let x = 0;
        for (let w of panes) {
            x += w * scale; // right edge of each pane
            paneEdges.push(x);
        }

        let i = 0;
        while (true) {
            const cx = offsetPx + i * (circleDiameterPx + spacingPx);

            // Stop if the **circle is completely past the right edge**
            if (cx - circleDiameterPx / 2 > wallWidthPx) break;

            let touchingPaneEdge = false;
            let x = 0;
            for (let edge of paneEdges) {
                const left = cx - circleDiameterPx / 2;
                const right = cx + circleDiameterPx / 2;
                if (left <= edge && right >= edge) { // overlaps boundary
                    touchingPaneEdge = true;
                    break;
                }
            }

            ctx.fillStyle = touchingPaneEdge ? "red" : "green";


            // Draw circle (automatically clipped at wall edges)
            ctx.beginPath();
            ctx.arc(cx, cy, circleDiameterPx / 2, 0, Math.PI * 2);
            ctx.arc(cx, cy - spacingY, circleDiameterPx / 2, 0, Math.PI * 2);
            ctx.fill();

            i++;
        }

        ctx.restore();
    }

    // 6️⃣ Draw the wall from inputs
    function drawWallFromInputs() {
        const wallHeight = parseFloat(document.getElementById("wallHeight").value);
        const panes = getPaneWidths();

        const wallWidth = panes.reduce((sum, w) => sum + w, 0);

        if (!validateWall(wallWidth, panes)) return;

        clearCanvas();
        const wall = { width: wallWidth, height: wallHeight };

        drawWallBackground(wall); // full wall
        drawPanes(wall, panes);   // draw panes on top
        drawPattern(wall, panes);        // global circle pattern
    }

    function downloadPositionsSorted(wall, panes) {
        const circleDiameter = parseFloat(document.getElementById("patternSize").value);
        const spacingX = parseFloat(document.getElementById("patternXSpacing").value);
        const userOffset = parseFloat(document.getElementById("patternOffset").value);


        // Compute pane edges
        const paneEdges = [];
        let x = 0;
        for (let i = 0; i < panes.length; i++) {
            paneEdges.push({ type: "pane", index: i, x: x }); // left edge of pane
            x += panes[i];
        }
        paneEdges.push({ type: "pane", index: panes.length, x: x }); // right edge of last pane

        // Compute circle positions
        const circles = [];
        let i = 0;
        while (true) {
            const cx = userOffset + i * (circleDiameter + spacingX); // X in cm
            const left = cx - circleDiameter / 2;
            const right = cx + circleDiameter / 2;

            if (left > wall.width) break; // fully past wall

            circles.push(
                { type: "circle", index: i + 1, label: "left", x: Math.max(0, left) },
                { type: "circle", index: i + 1, label: "center", x: cx },
                { type: "circle", index: i + 1, label: "right", x: Math.min(right, wall.width) }
            );

            i++;
        }

        // Merge and sort by x
        const allPositions = paneEdges.concat(circles);
        allPositions.sort((a, b) => a.x - b.x);

        // Build text
        let text = "Positions along X (cm) sorted\n\n";
        allPositions.forEach(pos => {
            if (pos.type === "pane") {
                text += `Pane limit ${pos.index}: ${pos.x.toFixed(2)}\n`;
            } else if (pos.type === "circle") {
                text += `Circle ${pos.index} ${pos.label}: ${pos.x.toFixed(2)}\n`;
            }
        });

        // Create and download
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "circle_positions.txt";
        a.click();
        URL.revokeObjectURL(url);
    }

    // 7️⃣ Event listener for Draw button
    drawBtn.addEventListener("click", drawWallFromInputs);

    document.getElementById("downloadBtn").addEventListener("click", () => {
        const wallHeight = parseFloat(document.getElementById("wallHeight").value);
        const panes = getPaneWidths();
        const wallWidth = panes.reduce((sum, w) => sum + w, 0);
        const wall = { width: wallWidth, height: wallHeight };

        downloadPositionsSorted(wall, panes);
    });

});



