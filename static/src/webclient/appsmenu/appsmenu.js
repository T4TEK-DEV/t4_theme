import { useEffect } from "@odoo/owl";
import { user } from "@web/core/user";
import { url } from "@web/core/utils/urls";
import { useBus, useService } from "@web/core/utils/hooks";
import { useHotkey } from "@web/core/hotkeys/hotkey_hook";

import { Dropdown } from "@web/core/dropdown/dropdown";

export class AppsMenu extends Dropdown {
    setup() {
    	super.setup();
    	this.commandPaletteOpen = false;
        this.commandService = useService("command");

        // Check if home menu overlay is enabled for active company
        const company = user.activeCompany || {};
        this.homeMenuEnabled = company.theme_home_menu_overlay !== false;

    	if (company.has_background_image) {
            this.imageUrl = url('/web/image', {
                model: 'res.company',
                field: 'background_image',
                id: company.id,
            });
    	} else {
    		this.imageUrl = '/t4_theme/static/src/img/background.png';
    	}

        // Only bind ESC if home menu overlay is enabled
        if (this.homeMenuEnabled) {
            useHotkey("escape", () => {
                if (this.state.isOpen) {
                    this.state.close();
                } else {
                    this.state.open();
                }
            }, { global: true });
        }

        useEffect(
            (isOpen) => {
            	if (isOpen) {
            		const openMainPalette = (ev) => {
            	    	if (
            	    		!this.commandPaletteOpen &&
            	    		ev.key.length === 1 &&
            	    		!ev.ctrlKey &&
            	    		!ev.altKey
            	    	) {
	            	        this.commandService.openMainPalette(
            	        		{ searchValue: `/${ev.key}` },
            	        		() => { this.commandPaletteOpen = false; }
            	        	);
	            	    	this.commandPaletteOpen = true;
            	    	}
            		}
	            	window.addEventListener("keydown", openMainPalette);
	                return () => {
	                	window.removeEventListener("keydown", openMainPalette);
	                	this.commandPaletteOpen = false;
	                }
            	}
            },
            () => [this.state.isOpen]
		);
    	useBus(this.env.bus, "ACTION_MANAGER:UI-UPDATED", () => {
			if (this.state.close) {
				this.state.close();
			}
		});
    }
    onOpened() {
		super.onOpened();
		if (this.menuRef && this.menuRef.el) {
			this.menuRef.el.style.backgroundImage = `url('${this.imageUrl}')`;
		}
    }
}
