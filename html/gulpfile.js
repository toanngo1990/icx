const { src, dest, lastRun, watch, series, parallel } = require('gulp');
const autoprefixer = require('gulp-autoprefixer');
const babel = require('gulp-babel');
const browserSync = require('browser-sync').create();
const cheerio = require('gulp-cheerio');
const cleanCSS = require('gulp-clean-css');
const concat = require('gulp-concat');
const dependents = require('gulp-dependents');
const filter = require('gulp-filter');
const imagemin = require('gulp-imagemin');
const inject = require('gulp-inject');
const newer = require('gulp-newer');
const pug = require('gulp-pug');
const rename = require('gulp-rename');
const sass = require('gulp-sass');
const svgstore = require('gulp-svgstore');
const sourcemaps = require('gulp-sourcemaps');
const uglify = require('gulp-uglify-es').default;

/**
 * Define paths
 */

const [SRC, DEST] = ['src/', 'dist/'];
const { S_ICONS, S_HTML, S_CSS, S_JS, S_IMAGES, S_BUNDLECSS, S_BUNDLEJS } = {
    "S_ICONS": SRC + 'icons/*.svg',
    "S_HTML": SRC + '**/*.pug',
    "S_CSS": SRC + '**/*.scss',
    "S_JS": [SRC + 'app.js', SRC + '_components/**/*.js', SRC + 'pages/**/*.js', SRC + 'woo/**/*.js'],
    "S_IMAGES": SRC + 'images/**/*',
    "S_BUNDLECSS": [SRC + 'bundle/**/*.css', '!' + SRC + 'bundle/**/_*.css', '!' + SRC + 'bundle/_*/**'],
    "S_BUNDLEJS": ['node_modules/bootstrap/dist/js/bootstrap.bundle.js', SRC + 'bundle/**/*.js', '!' + SRC + 'bundle/**/_*.js', '!' + SRC + 'bundle/_*/**']
}

/**
 * Define dependents
 */

const pugConfig = {
    '.pug': {
        parserSteps: [
            /^\s*(?:extends|include)\s+(.+?)\s*$/gm,
            function (str) {
                const absolute = str.match(/^[\\/]+(.+)/);
                if (absolute) {
                    str = resolve(absolute[1]);
                }
                return [str];
            },
        ],
        prefixes: ['_'],
        postfixes: ['.pug'],
    }
};

/**
 * Define tasks using plain functions
 */

function icons() {
    var svgs = src(S_ICONS)
        .pipe(cheerio({
            run: function ($) {
                $('[fill]').removeAttr('fill');
                $('[fill-opacity]').removeAttr('fill-opacity');
                $('[stroke]').removeAttr('stroke');
                $('[stroke-width]').removeAttr('stroke-width');
            },
            parserOptions: { xmlMode: true }
        }))
        .pipe(rename({ prefix: 'icon-' }))
        .pipe(svgstore({ inlineSvg: true }));

    function fileContents(filePath, file) {
        return file.contents.toString();
    }

    return src(SRC + '_layouts/icons.html')
        .pipe(inject(svgs, { transform: fileContents }))
        .pipe(dest(SRC + '_layouts'))
        .pipe(dest(DEST))
        .pipe(browserSync.stream());
}

function images() {
    return src(S_IMAGES, { since: lastRun(images) })
        .pipe(newer(DEST + 'images'))
        .pipe(imagemin([
                imagemin.mozjpeg({quality: 75, progressive: true}),
                imagemin.optipng({optimizationLevel: 5})
            ], {
            verbose: true,
        }))
        .pipe(dest(DEST + 'images'));
}

function html() {
    const f = filter(['**', '!' + SRC + '_*/**', '!' + SRC + '**/_*.pug']);
    return src(S_HTML, { since: lastRun(html) })
        .pipe(dependents(pugConfig))
        .pipe(f)
        .pipe(pug({ pretty: '    ' }))
        .pipe(rename({ dirname: '' }))
        .pipe(dest(DEST))
        .pipe(browserSync.stream({ once: true }));
}

function css() {
    return src(S_CSS, { sourcemaps: true, since: lastRun(css) })
        .pipe(dependents())
        .pipe(sourcemaps.init())
        .pipe(sass({
            outputStyle: 'expanded',
            includePaths: ['node_modules']
        }).on('error', sass.logError))
        .pipe(autoprefixer({
            cascade: false
        }))
        .pipe(sourcemaps.write('.'))
        .pipe(dest(DEST + 'css'))
        .pipe(browserSync.stream());
}

function minifyCss() {
    return src([DEST + 'css/*.css', '!' + DEST + 'css/*min.css'], { since: lastRun(minifyCss) })
        .pipe(cleanCSS({ debug: true }, (details) => {
            console.log(`${details.name}: ${details.stats.originalSize}`);
            console.log(`${details.name}: ${details.stats.minifiedSize}`);
        }))
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(dest(DEST + 'css'))
        .pipe(browserSync.stream());
}

function js() {
    return src(S_JS)
        .pipe(concat('app.js'))
        .pipe(babel({ presets: ['@babel/preset-env'] }))
        .pipe(uglify())
        .pipe(dest(DEST + 'js'))
        .pipe(browserSync.stream());
}

function bundleCss() {
    return src(S_BUNDLECSS)
        .pipe(concat('bundle.min.css'))
        .pipe(cleanCSS())
        .pipe(dest(DEST + 'css'));
}

function bundleJs() {
    return src(S_BUNDLEJS)
        .pipe(concat('bundle.min.js'))
        .pipe(uglify())
        .pipe(dest(DEST + 'js'));
}

function watcher() {
    browserSync.init({
        server: DEST,
        port: 8191
    });
    watch(S_ICONS, series(icons, html));
    watch(S_HTML, html);
    watch(S_CSS, series(css, minifyCss));
    watch(S_JS, js);
}

/*
 * Specify if tasks run in series or parallel using `series` and `parallel`
 */

const bundle = parallel(bundleCss, bundleJs);
const start = series(icons, parallel(html, css, js), minifyCss, watcher);
const build = series(icons, bundle, parallel(html, css, js), minifyCss);

/*
 * You can use CommonJS `exports` module notation to declare tasks
 */

exports.build = build;
exports.start = start;
exports.images = images;
exports.bundle = bundle;

/*
 * Define default task that can be called by just running `gulp` from cli
 */

exports.default = build;