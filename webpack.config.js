const { join, resolve } = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');


const devServer = {
    contentBase: join(__dirname, 'dist'),
    compress: false,
    port: 9000,
    index: 'index.html'
};

module.exports = {
    entry: join(__dirname, 'src', 'index.tsx'),
    output: {
        path: join(__dirname, 'dist'),
        filename: 'bundle.js',
    },
    optimization: {
        minimize: false
    },
    devServer,
    resolve: {
        // Add `.ts` and `.tsx` as a resolvable extension.
        extensions: ['.ts', '.tsx', '.js']
    },
    module: {
        rules: [
            { test: /\.tsx?$/, loader: 'ts-loader' },
            {
                test: /\.less$/,
                use: [
                    'style-loader',
                    'css-loader',
                    'less-loader'
                ],
            }
        ]
    },
    plugins: [
        new CopyWebpackPlugin([
            {
                from: 'src/*.html',
                to: '',
                flatten: true
            }
        ])
    ]
};