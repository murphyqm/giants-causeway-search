// Configuration - load handmade exhibition data
const DATA_SOURCE = 'archives.txt';

class IIIFExhibition {
    constructor() {
        this.items = [];
        this.filteredItems = [];
        this.currentModal = null;
        this.mapInstances = [];
        this.init();
    }

    async init() {
        try {
            await this.loadAllData();
            this.setupSearch();
            this.setupModal();
            this.render();
            document.getElementById('loading').style.display = 'none';
        } catch (error) {
            console.error('Error initializing exhibition:', error);
            this.showError(`Failed to load exhibition: ${error.message}`);
        }
    }

    async loadAllData() {
        try {
            const data = await this.loadTSV(DATA_SOURCE);
            this.items = data;
            this.filteredItems = data;
            console.log(`Loaded ${data.length} items from ${DATA_SOURCE}`);
        } catch (error) {
            console.warn(`Error loading ${DATA_SOURCE}:`, error);
        }
    }

    async loadTSV(filename) {
        const response = await fetch(filename);
        if (!response.ok) throw new Error(`Could not load ${filename}`);
        
        // Read as ArrayBuffer to handle encoding properly
        const arrayBuffer = await response.arrayBuffer();
        
        // Try UTF-8 first (most common for web), then fall back to iso-8859-1
        // This preserves Irish/European diacritical marks correctly
        let text;
        try {
            const decoder = new TextDecoder('utf-8');
            text = decoder.decode(arrayBuffer);
        } catch (e) {
            // Fall back to iso-8859-1 if UTF-8 fails
            const decoder = new TextDecoder('iso-8859-1');
            text = decoder.decode(arrayBuffer);
        }
        
        return this.parseTSV(text);
    }

    parseTSV(text) {
        const lines = text.trim().split('\n');
        const headers = lines[0].split('\t');
        const items = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split('\t');
            const obj = {};
            
            headers.forEach((header, index) => {
                // Sanitize each value as it's extracted to fix encoding issues
                const rawValue = values[index] ? values[index].trim() : '';
                obj[header.trim()] = this.sanitizeText(rawValue);
            });

            // Parse all available fields from the enriched data file
            const item = {
                title: obj.iiif_label || obj.manifest || 'Untitled',
                manifest: obj.manifest || '',
                recordUrl: obj.record_url || '',
                thumbnail: obj.thumbnail || '',
                dataset: obj.dataset_key || '',
                datasetName: 'MAPPED ARTEFACT',
                iiifLabel: obj.iiif_label || '',
                iiifExtent: obj.iiif_extent || '',
                iiifDate: obj.iiif_date || '',
                iiifCollections: obj.iiif_collections || '',
                altTextV1: obj.copilot_alt_text_v1 || '',
                altTextV2: obj.copilot_alt_text_v2 || '',
                imageCaptionV1: obj.copilot_image_caption_v1 || '',
                imageCaptionV2: obj.copilot_image_caption_v2 || '',
                searchTermsV1: obj.copilot_search_terms_v1 || '',
                searchTermsV2: obj.copilot_search_terms_v2 || '',
                coordinates: obj.coordinates || '',
                geometryType: obj.geometry_type || '',
                metadata: {
                    institution: obj.iiif_collections || '',
                    date: obj.iiif_date || '',
                    extent: obj.iiif_extent || ''
                },
                // Linked items data
                linkedItems: [],
                linkedItemsCount: obj.linked_items_count || '',
                linkingMethod: obj.linking_method || ''
            };
            
            // Parse linked items 1, 2, 3
            for (let itemNum = 1; itemNum <= 3; itemNum++) {
                const linkedUrl = obj[`linked_item_${itemNum}_url`];
                if (linkedUrl) {
                    item.linkedItems.push({
                        url: linkedUrl,
                        title: obj[`linked_item_${itemNum}_title`] || '',
                        institution: obj[`linked_item_${itemNum}_institution`] || '',
                        archiveCollection: obj[`linked_item_${itemNum}_archive_collection`] || '',
                        itemType: obj[`linked_item_${itemNum}_item_type`] || '',
                        date: obj[`linked_item_${itemNum}_date`] || '',
                        description: obj[`linked_item_${itemNum}_description`] || '',
                        keywords: obj[`linked_item_${itemNum}_keywords`] || '',
                        theme: obj[`linked_item_${itemNum}_theme`] || '',
                        relevance: obj[`linked_item_${itemNum}_relevance`] || '',
                        sourceRefId: obj[`linked_item_${itemNum}_source_reference_id`] || '',
                        linkConfidence: obj[`linked_item_${itemNum}_link_confidence`] || ''
                    });
                }
            }
            
            if (item.manifest) {
                items.push(item);
            }
        }

        return items;
    }



    setupSearch() {
        const searchBox = document.getElementById('search-box');
        searchBox.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            this.filterBySearch(query);
        });
    }

    filterBySearch(query) {
        if (!query) {
            this.filteredItems = this.items;
        } else {
            this.filteredItems = this.items.filter(item => {
                const searchableText = [
                    item.title,
                    item.altTextV1,
                    item.altTextV2,
                    item.imageCaptionV1,
                    item.imageCaptionV2,
                    item.searchTermsV1,
                    item.searchTermsV2,
                    item.iiifLabel
                ].join(' ').toLowerCase();
                
                return searchableText.includes(query);
            });
        }
        this.render();
    }

    setupModal() {
        const modal = document.getElementById('item-modal');
        const closeBtn = document.querySelector('.modal-close');
        
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    openModal(item) {
        const modal = document.getElementById('item-modal');
        
        // Set image
        document.getElementById('modal-image').src = item.thumbnail;
        document.getElementById('modal-image').alt = item.altText;
        
        // Set title
        document.getElementById('modal-title').textContent = item.title;
        
        // Set metadata
        const metadataDiv = document.getElementById('modal-metadata');
        metadataDiv.innerHTML = '';
        if (item.iiifExtent) {
            const div = document.createElement('div');
            div.className = 'modal-metadata-item';
            div.innerHTML = `<span class="modal-metadata-label">Extent:</span> <span class="modal-metadata-value">${this.escapeHTML(item.iiifExtent)}</span>`;
            metadataDiv.appendChild(div);
        }
        if (item.iiifDate) {
            const div = document.createElement('div');
            div.className = 'modal-metadata-item';
            div.innerHTML = `<span class="modal-metadata-label">Date:</span> <span class="modal-metadata-value">${this.escapeHTML(item.iiifDate)}</span>`;
            metadataDiv.appendChild(div);
        }
        if (item.iiifCollections) {
            const div = document.createElement('div');
            div.className = 'modal-metadata-item';
            div.innerHTML = `<span class="modal-metadata-label">Collection:</span> <span class="modal-metadata-value">${this.escapeHTML(item.iiifCollections)}</span>`;
            metadataDiv.appendChild(div);
        }
        
        // Set links
        const linksDiv = document.getElementById('modal-links');
        linksDiv.innerHTML = '';
        if (item.recordUrl) {
            const link = document.createElement('a');
            link.href = item.recordUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = 'Visit Record';
            linksDiv.appendChild(link);
        }
        if (item.manifest) {
            const link = document.createElement('a');
            link.href = item.manifest;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = 'IIIF Manifest';
            linksDiv.appendChild(link);
        }
        if (item.manifest) {
            const miradorLink = document.createElement('a');
            miradorLink.href = `https://universalviewer.io/uv.html?manifest=${encodeURIComponent(item.manifest)}`;
            miradorLink.target = '_blank';
            miradorLink.rel = 'noopener noreferrer';
            miradorLink.textContent = 'View Manifest';
            linksDiv.appendChild(miradorLink);
        }
        
        // Set description
        const descDiv = document.getElementById('modal-description-section');
        descDiv.innerHTML = '';
        
        // Add Machine Perspectives header if we have any machine-generated content or linked items
        const hasMachineContent = item.altTextV1 || item.altTextV2 || item.imageCaptionV1 || item.imageCaptionV2 || item.searchTermsV1 || item.searchTermsV2 || (item.linkedItems && item.linkedItems.length > 0);
        if (hasMachineContent) {
            const machineHeader = document.createElement('h3');
            machineHeader.textContent = 'Machine Perspectives';
            machineHeader.style.marginTop = '0';
            descDiv.appendChild(machineHeader);
        }
        
        // Alt Text V1
        if (item.altTextV1) {
            const section = document.createElement('div');
            section.className = 'description-section';
            section.innerHTML = `
                <h4>Copilot generated alt text v1</h4>
                <p>${this.escapeHTML(item.altTextV1)}</p>
            `;
            descDiv.appendChild(section);
        }
        
        // Alt Text V2
        if (item.altTextV2) {
            const section = document.createElement('div');
            section.className = 'description-section';
            section.innerHTML = `
                <h4>Copilot generated alt text v2</h4>
                <p>${this.escapeHTML(item.altTextV2)}</p>
            `;
            descDiv.appendChild(section);
        }
        
        // Image Caption V1
        if (item.imageCaptionV1) {
            const section = document.createElement('div');
            section.className = 'description-section';
            section.innerHTML = `
                <h4>Copilot generated Image Description v1</h4>
                <p>${this.escapeHTML(item.imageCaptionV1)}</p>
            `;
            descDiv.appendChild(section);
        }
        
        // Image Caption V2
        if (item.imageCaptionV2) {
            const section = document.createElement('div');
            section.className = 'description-section';
            section.innerHTML = `
                <h4>Copilot generated Image Description v2</h4>
                <p>${this.escapeHTML(item.imageCaptionV2)}</p>
            `;
            descDiv.appendChild(section);
        }
        
        // Set search terms
        const termsDiv = document.getElementById('modal-search-terms-section');
        termsDiv.innerHTML = '';
        
        // Search Terms V1
        if (item.searchTermsV1) {
            const terms = item.searchTermsV1.split(',').map(t => t.trim()).filter(t => t);
            if (terms.length > 0) {
                const section = document.createElement('div');
                section.className = 'search-terms-section';
                section.innerHTML = '<h4>Copilot generated Search Terms v1</h4>';
                const tagContainer = document.createElement('div');
                tagContainer.className = 'search-terms-list';
                terms.forEach(term => {
                    const tag = document.createElement('span');
                    tag.className = 'search-term-tag';
                    tag.textContent = term;
                    tagContainer.appendChild(tag);
                });
                section.appendChild(tagContainer);
                termsDiv.appendChild(section);
            }
        }
        
        // Search Terms V2
        if (item.searchTermsV2) {
            const terms = item.searchTermsV2.split(',').map(t => t.trim()).filter(t => t);
            if (terms.length > 0) {
                const section = document.createElement('div');
                section.className = 'search-terms-section';
                section.innerHTML = '<h4>Copilot generated Search Terms v2</h4>';
                const tagContainer = document.createElement('div');
                tagContainer.className = 'search-terms-list';
                terms.forEach(term => {
                    const tag = document.createElement('span');
                    tag.className = 'search-term-tag';
                    tag.textContent = term;
                    tagContainer.appendChild(tag);
                });
                section.appendChild(tagContainer);
                termsDiv.appendChild(section);
            }
        }

        // Linked items
        if (item.linkedItems && item.linkedItems.length > 0) {
            const linkedSection = document.createElement('div');
            linkedSection.className = 'description-section';
            linkedSection.innerHTML = '<h4>Linked Records</h4>';
            
            item.linkedItems.forEach((linkedItem, idx) => {
                // Create title header with link
                const titleHeader = document.createElement('h5');
                titleHeader.style.margin = '1rem 0 0.5rem 0';
                titleHeader.style.fontSize = '0.95rem';
                titleHeader.style.fontWeight = '600';
                
                const sanitizedTitle = this.sanitizeText(linkedItem.title);
                if (linkedItem.url) {
                    const link = document.createElement('a');
                    link.href = linkedItem.url;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.textContent = sanitizedTitle;
                    link.style.textDecoration = 'underline';
                    link.style.color = 'inherit';
                    titleHeader.appendChild(link);
                } else {
                    titleHeader.textContent = sanitizedTitle;
                }
                
                linkedSection.appendChild(titleHeader);
                
                // Create indented list for details
                const detailsList = document.createElement('ul');
                detailsList.style.margin = '0.25rem 0 1rem 1.5rem';
                detailsList.style.fontSize = '0.9rem';
                
                const details = [
                    { label: 'Institution', value: linkedItem.institution },
                    { label: 'Archive Collection', value: linkedItem.archiveCollection },
                    { label: 'Item Type', value: linkedItem.itemType },
                    { label: 'Date', value: linkedItem.date },
                    { label: 'Description', value: linkedItem.description },
                    { label: 'Keywords', value: linkedItem.keywords },
                    { label: 'Theme', value: linkedItem.theme },
                    { label: 'Relevance', value: linkedItem.relevance },
                    { label: 'Source Reference', value: linkedItem.sourceRefId },
                    { label: 'Link Confidence', value: linkedItem.linkConfidence }
                ];
                
                details.forEach(detail => {
                    if (detail.value) {
                        const li = document.createElement('li');
                        const sanitizedValue = this.sanitizeText(detail.value);
                        li.innerHTML = `<strong>${detail.label}:</strong> ${this.escapeHTML(sanitizedValue)}`;
                        detailsList.appendChild(li);
                    }
                });
                
                linkedSection.appendChild(detailsList);
            });
            
            // Add linking method info if available
            if (item.linkedItemsCount || item.linkingMethod) {
                const infoDiv = document.createElement('div');
                infoDiv.style.marginTop = '1rem';
                infoDiv.style.fontSize = '0.9rem';
                infoDiv.style.color = '#666';
                
                let infoHTML = '';
                if (item.linkedItemsCount) {
                    infoHTML += `<p><strong>Total linked records:</strong> ${this.escapeHTML(item.linkedItemsCount)}</p>`;
                }
                if (item.linkingMethod) {
                    infoHTML += `<p><strong>Linking method:</strong> ${this.escapeHTML(item.linkingMethod)}</p>`;
                }
                
                infoDiv.innerHTML = infoHTML;
                linkedSection.appendChild(infoDiv);
            }
            
            descDiv.appendChild(linkedSection);
        }

        // Initialize map in modal
        if (item.currentMap) {
            item.currentMap.remove();
            item.currentMap = null;
        }
        
        if (item.coordinates) {
            // Recreate map container to avoid Leaflet initialization conflicts
            let mapContainer = document.getElementById('modal-map-container');
            const imageSection = mapContainer.parentElement;
            
            // Remove old container and create new one
            mapContainer.remove();
            const newMapContainer = document.createElement('div');
            newMapContainer.id = 'modal-map-container';
            newMapContainer.style.width = '100%';
            newMapContainer.style.height = '300px';
            newMapContainer.style.marginTop = '1rem';
            newMapContainer.style.border = '1px solid #ddd';
            
            imageSection.appendChild(newMapContainer);
            mapContainer = newMapContainer;

            const mapLabel = document.getElementById('modal-map-label');
            
            // Add Human Perspectives header before the map label
            const humanHeader = document.createElement('h3');
            humanHeader.textContent = 'Human Perspectives';
            humanHeader.style.marginTop = '1.5rem';
            humanHeader.style.marginBottom = '0.5rem';
            imageSection.insertBefore(humanHeader, mapLabel);

            mapLabel.textContent = 'Click mapped area to see other images from the same location:';
            mapLabel.style.display = 'block';
            mapLabel.style.marginTop = '0';

            // Show modal first, then initialize map
            modal.style.display = 'flex';

            setTimeout(() => {
                const map = this.initializeModalMap(mapContainer, item);
                item.currentMap = map;
            }, 300);
        } else {
            document.getElementById('modal-map-container').style.display = 'none';
            document.getElementById('modal-map-label').style.display = 'none';
            modal.style.display = 'flex';
        }
    }

    render() {
        // Clean up old maps before re-rendering
        if (this.mapInstances) {
            this.mapInstances.forEach(map => {
                map.remove();
            });
            this.mapInstances = [];
        }

        const exhibition = document.getElementById('exhibition');
        exhibition.innerHTML = '';

        if (this.filteredItems.length === 0) {
            exhibition.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">No items found.</p>';
            return;
        }

        // Simply render all filtered items in a grid
        this.filteredItems.forEach(item => {
            const itemEl = this.createItemElement(item);
            exhibition.appendChild(itemEl);
        });
    }

    createItemElement(item) {
        const div = document.createElement('div');
        div.className = 'item';
        div.setAttribute('data-manifest', item.manifest);

        const imageHTML = item.thumbnail
            ? `<img src="${item.thumbnail}" alt="${item.altText || item.title}" loading="lazy">`
            : '<div class="placeholder">[image unavailable]</div>';

        const metadataHTML = [
            item.iiifDate && `<div class="item-metadata">${this.escapeHTML(item.iiifDate)}</div>`,
            item.iiifExtent && `<div class="item-metadata">${this.escapeHTML(item.iiifExtent)}</div>`
        ].filter(Boolean).join('');

        const displayTitle = item.title;

        // Create links
        const links = [];
        if (item.recordUrl) {
            links.push(`<a href="${item.recordUrl}" target="_blank" rel="noopener noreferrer" class="item-link">Visit Record</a>`);
        }
        if (item.manifest) {
            links.push(`<a href="${item.manifest}" target="_blank" rel="noopener noreferrer" class="item-link">IIIF Manifest</a>`);
        }
        const linkHTML = links.length > 0 ? `<div style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">${links.join('')}</div>` : '';

        div.innerHTML = `
            <div class="item-image">
                ${imageHTML}
            </div>
            <div class="item-content">
                <h3 class="item-title">${this.escapeHTML(displayTitle)}</h3>
                ${metadataHTML}
                <div class="item-dataset">${item.datasetName}</div>
                ${linkHTML}
            </div>
        `;

        // Add click handler to image
        const img = div.querySelector('.item-image img');
        if (img) {
            img.style.cursor = 'pointer';
            img.addEventListener('click', () => this.openModal(item));
        }

        return div;
    }

    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    sanitizeText(text) {
        if (!text) return text;
        // Fix specific mojibake patterns while preserving legitimate Unicode
        // (Irish/European accented characters: é, ú, á, ö, etc.)
        
        // 1. UTF-8 replacement character (ï¿½) masking apostrophes/punctuation
        //    Commonly appears as: "Giant's" -> "Giantï¿½s", "Causeway's" -> "Causewayï¿½s"
        text = text.replace(/([a-zA-Z])ï¿½([a-zA-Zs])/g, "$1'$2");
        
        // 2. Year ranges with mojibake: only replace high bytes BETWEEN year numbers
        //    E.g., "1905[0xC2 0xA0]1929" -> "1905–1929"
        text = text.replace(/(\d{4})[\x80-\xFF]+(\d{4})/g, '$1–$2');
        
        // 3. Other high-byte mojibake patterns (stray non-ASCII bytes)
        //    Only between ASCII letters to avoid breaking legitimate Unicode
        text = text.replace(/([a-z])[\x80-\xFF]s\b/gi, "$1's");
        
        // Note: Legitimate Unicode text with accents (Dúchas, Fiannaigheacht) preserved
        return text;
    }

    initializeItemMap(mapId, item) {
        try {
            const coordinates = this.parseCoordinates(item.coordinates);
            if (!coordinates || coordinates.length === 0) return;

            const geoType = (item.geometryType || '').trim().toLowerCase();
            console.log(`Drawing ${geoType} for ${item.title}:`, JSON.stringify(coordinates).substring(0, 100));
            let center;

            // Get center based on geometry type
            if (geoType === 'point') {
                // For Point, coordinates are [lon, lat]
                center = L.latLng(coordinates[1], coordinates[0]);
            } else {
                // For Polygon or other types, extract center from bounds
                const ring = Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0]) ? coordinates[0] : coordinates;
                const bounds = L.latLngBounds(ring.map(c => [c[1], c[0]]));
                center = bounds.getCenter();
            }

            // Create map
            const map = L.map(mapId, {
                center: center,
                zoom: 15,
                dragging: false,
                doubleClickZoom: false,
                scrollWheelZoom: false,
                boxZoom: false,
                keyboard: false,
                touchZoom: false
            });

            // Add greyscale OSM tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18
            }).addTo(map);

            // Draw the geometry
            if (geoType === 'polygon') {
                // For Polygon, coordinates are [[[lon, lat], ...]]
                // Extract the outer ring (first element)
                const ring = Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0]) ? coordinates[0] : coordinates;
                const polygon = L.polygon(ring.map(c => [c[1], c[0]]), {
                    color: '#000',
                    weight: 2,
                    opacity: 0.8,
                    fillOpacity: 0.2
                }).addTo(map);

                // Fit map to polygon bounds
                map.fitBounds(polygon.getBounds());
            } else if (geoType === 'point') {
                // For Point, coordinates are [lon, lat]
                L.circleMarker(center, {
                    radius: 6,
                    color: '#000',
                    weight: 2,
                    opacity: 0.8,
                    fillOpacity: 0.2
                }).addTo(map);
            } else {
                // Fallback: draw as polyline if geometry type not recognized
                const ring = Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0]) ? coordinates[0] : coordinates;
                const polyline = L.polyline(ring.map(c => [c[1], c[0]]), {
                    color: '#000',
                    weight: 2,
                    opacity: 0.8
                }).addTo(map);
                map.fitBounds(polyline.getBounds());
            }

            // Add click handler for popup
            map.on('click', () => {
                this.showLocationPopup(item, map);
            });

            // Store map reference for later cleanup
            if (!this.mapInstances) this.mapInstances = [];
            this.mapInstances.push(map);

        } catch (error) {
            console.error('Error initializing map:', error);
        }
    }

    initializeModalMap(container, item) {
        try {
            const coordinates = this.parseCoordinates(item.coordinates);
            if (!coordinates || coordinates.length === 0) {
                console.warn('No valid coordinates found');
                return null;
            }

            const geoType = (item.geometryType || '').trim().toLowerCase();
            console.log(`[Modal] Drawing ${geoType} for ${item.title}:`, JSON.stringify(coordinates).substring(0, 100));
            let center;

            // Get center based on geometry type
            if (geoType === 'point') {
                // For Point, coordinates are [lon, lat]
                center = L.latLng(coordinates[1], coordinates[0]);
                console.log(`[Modal] Point center:`, center);
            } else {
                // For Polygon or other types, extract center from bounds
                const ring = Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0]) ? coordinates[0] : coordinates;
                const bounds = L.latLngBounds(ring.map(c => [c[1], c[0]]));
                center = bounds.getCenter();
                console.log(`[Modal] Polygon bounds:`, bounds, `center:`, center);
            }

            // Create map
            const map = L.map(container, {
                center: center,
                zoom: 15,
                dragging: true,
                doubleClickZoom: true,
                scrollWheelZoom: true,
                boxZoom: true,
                keyboard: true,
                touchZoom: true
            });

            // Add greyscale OSM tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18
            }).addTo(map);

            // Invalidate size to ensure map renders properly
            setTimeout(() => {
                map.invalidateSize();
            }, 100);

            // Draw the geometry
            if (geoType === 'polygon') {
                // For Polygon, coordinates are [[[lon, lat], ...]]
                // Extract the outer ring (first element)
                const ring = Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0]) ? coordinates[0] : coordinates;
                console.log(`Polygon ring length: ${ring.length}, first point: [${ring[0]}]`);
                const polygon = L.polygon(ring.map(c => [c[1], c[0]]), {
                    color: '#000',
                    weight: 2,
                    opacity: 0.8,
                    fillOpacity: 0.2
                }).addTo(map);

                // Fit map to polygon bounds
                const bounds = polygon.getBounds();
                console.log(`Polygon bounds: ${bounds}`);
                map.fitBounds(bounds, { padding: [50, 50] });
            } else if (geoType === 'point') {
                console.log(`[Modal] Drawing Point marker at:`, center);
                L.circleMarker(center, {
                    radius: 6,
                    color: '#000',
                    weight: 2,
                    opacity: 0.8,
                    fillOpacity: 0.2
                }).addTo(map);
            } else {
                // Fallback: draw as polyline if geometry type not recognized
                const ring = Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0]) ? coordinates[0] : coordinates;
                const polyline = L.polyline(ring.map(c => [c[1], c[0]]), {
                    color: '#000',
                    weight: 2,
                    opacity: 0.8
                }).addTo(map);
                map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
            }

            // Add click handler for popup
            map.on('click', () => {
                this.showLocationPopup(item, map);
            });

            console.log('Map initialized successfully');
            return map;

        } catch (error) {
            console.error('Error initializing modal map:', error);
            return null;
        }
    }

    parseCoordinates(coordString) {
        try {
            if (!coordString) return [];
            // Parse GeoJSON format: [[lon,lat], [lon,lat], ...]
            const coords = JSON.parse(coordString);
            return coords;
        } catch (error) {
            console.error('Error parsing coordinates:', error);
            return [];
        }
    }

    showLocationPopup(item, map) {
        // Find all items with the same coordinates
        const itemsAtLocation = this.items.filter(i => 
            i.coordinates === item.coordinates && i.thumbnail
        );

        // Create popup content
        const popup = document.createElement('div');
        popup.className = 'location-popup-content';
        
        const title = document.createElement('h4');
        title.textContent = `${itemsAtLocation.length} image${itemsAtLocation.length !== 1 ? 's' : ''} at this location`;
        popup.appendChild(title);

        const thumbnailContainer = document.createElement('div');
        thumbnailContainer.className = 'location-popup-thumbnails';

        itemsAtLocation.forEach(locationItem => {
            const thumbDiv = document.createElement('div');
            thumbDiv.className = 'location-popup-thumb';
            
            const img = document.createElement('img');
            img.src = locationItem.thumbnail;
            img.alt = locationItem.title;
            thumbDiv.appendChild(img);

            thumbDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openModal(locationItem);
            });

            thumbDiv.title = locationItem.title;
            thumbnailContainer.appendChild(thumbDiv);
        });

        popup.appendChild(thumbnailContainer);

        // Create Leaflet popup
        const coordinates = this.parseCoordinates(item.coordinates);
        if (coordinates && coordinates.length > 0) {
            const center = L.latLng(coordinates[0][1], coordinates[0][0]);
            L.popup({ maxWidth: 350 })
                .setLatLng(center)
                .setContent(popup)
                .openOn(map);
        }
    }

    showError(message) {
        const errorEl = document.getElementById('error');
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        document.getElementById('loading').style.display = 'none';
    }


}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    const exhibition = new IIIFExhibition();
    // Thumbnails are already in the consolidated file, no need to fetch
});
