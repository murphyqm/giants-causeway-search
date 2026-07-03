// Configuration - load handmade exhibition data
const DATA_SOURCE = 'handmade_exhibition_with_images_new_described.txt';

class IIIFExhibition {
    constructor() {
        this.items = [];
        this.filteredItems = [];
        this.currentModal = null;
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
        
        const text = await response.text();
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
                obj[header.trim()] = values[index] ? values[index].trim() : '';
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
                metadata: {
                    institution: obj.iiif_collections || '',
                    date: obj.iiif_date || '',
                    extent: obj.iiif_extent || ''
                }
            };
            
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
        
        // Set description
        const descDiv = document.getElementById('modal-description-section');
        descDiv.innerHTML = '';
        
        // Alt Text V1
        if (item.altTextV1) {
            const section = document.createElement('div');
            section.className = 'description-section';
            section.innerHTML = `
                <h3>Copilot generated alt text v1</h3>
                <p>${this.escapeHTML(item.altTextV1)}</p>
            `;
            descDiv.appendChild(section);
        }
        
        // Alt Text V2
        if (item.altTextV2) {
            const section = document.createElement('div');
            section.className = 'description-section';
            section.innerHTML = `
                <h3>Copilot generated alt text v2</h3>
                <p>${this.escapeHTML(item.altTextV2)}</p>
            `;
            descDiv.appendChild(section);
        }
        
        // Image Caption V1
        if (item.imageCaptionV1) {
            const section = document.createElement('div');
            section.className = 'description-section';
            section.innerHTML = `
                <h3>Copilot generated Image Description v1</h3>
                <p>${this.escapeHTML(item.imageCaptionV1)}</p>
            `;
            descDiv.appendChild(section);
        }
        
        // Image Caption V2
        if (item.imageCaptionV2) {
            const section = document.createElement('div');
            section.className = 'description-section';
            section.innerHTML = `
                <h3>Copilot generated Image Description v2</h3>
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
                section.innerHTML = '<h3>Copilot generated Search Terms v1</h3>';
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
                section.innerHTML = '<h3>Copilot generated Search Terms v2</h3>';
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
        
        modal.style.display = 'flex';
    }

    render() {
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
