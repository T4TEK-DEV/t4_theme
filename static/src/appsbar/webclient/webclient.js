import { patch } from '@web/core/utils/patch';

import { WebClient } from '@web/webclient/webclient';
import { AppsBar } from '@t4_theme/appsbar/webclient/appsbar/appsbar';

patch(WebClient, {
    components: {
        ...WebClient.components,
        AppsBar,
    },
});
