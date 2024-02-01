var $ = jQuery.noConflict();

// Main functions
(function ($) {
    function initSelect2() {
        $('select').select2({
            width: "100%",
            minimumResultsForSearch: -1
        });
    }

    function initNavInline() {
        const $nav = document.querySelectorAll('[data-nav-inline] [class*="active"]');
        $nav.forEach(function (item) {
            item.scrollIntoView({
                behavior: 'auto',
                block: 'end',
                inline: 'center'
            }
            );
        });
    }

    function initTooltip() {
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
        const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))
    }

    $(function () {
        // initSelect2();
        initNavInline();
        initTooltip();
    });
})(jQuery);