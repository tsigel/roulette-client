import { Configuration } from 'webpack';
import { Configuration as DevServerConfiguration } from 'webpack-dev-server';
import { join } from 'path';
import * as CopyWebpackPlugin from 'copy-webpack-plugin';


const devServer: DevServerConfiguration = {
    contentBase: join(__dirname, 'dist'),
    compress: false,
    port: 9000,
    index: 'index.html'
};

const config: Configuration = {
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
            { test: /\.tsx?$/, loader: 'ts-loader' }
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

export = config;