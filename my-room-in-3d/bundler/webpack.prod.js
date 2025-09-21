const { merge } = require('webpack-merge')
const commonConfiguration = require('./webpack.common.js')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const MiniCSSExtractPlugin = require('mini-css-extract-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const path = require('path')

module.exports = merge(
    commonConfiguration,
    {
        mode: 'production',
        devtool: false,
        output: {
            path: path.resolve(__dirname, '../dist'),
            filename: 'bundle.[contenthash].js',
            publicPath: '/',
            clean: true
        },
        plugins:
        [
            new CleanWebpackPlugin(),
            new MiniCSSExtractPlugin({
                filename: '[name].[contenthash].css'
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: path.resolve(__dirname, '../static'),
                        to: path.resolve(__dirname, '../dist/assets'),
                        noErrorOnMissing: true
                    }
                ]
            })
        ],
        module: {
            rules: [
                {
                    test: /\.(css)$/,
                    use: [
                        MiniCSSExtractPlugin.loader,
                        'css-loader'
                    ]
                }
            ]
        },
        optimization: {
            splitChunks: {
                chunks: 'all',
                cacheGroups: {
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        chunks: 'all',
                    }
                }
            }
        },
        performance: {
            hints: 'warning',
            maxEntrypointSize: 512000,
            maxAssetSize: 512000
        }
    }
)
