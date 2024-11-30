const session = require('express-session');
const productModel = require('../../models/Product');
const categoryModel = require('../../models/Category');
const brandModel = require('../../models/Brand');
const orderItemModel = require('../../models/OrderItem');
const commentModel = require('../../models/Comment');
const imageItemModel = require('../../models/ImageItem');
const path = require('path');
const { features } = require('process');
// Go up two levels from the current directory
class AdminProductController {
    //trả về view -> (req, res)
    static index = async (req, res) => {
        try {
            const page = req.query.page || 1;
            const item_per_page = process.env.PRODUCT_ITEM_PER_PAGE;
            let conds = {};
            let sorts = {};

            const search = req.query.search;
            if (search) {
                conds.name = {
                    type: 'LIKE',
                    val: `'%${search}%'`
                }
                //select * from view_product where name like '%kem%'
            }
            // /danh-muc/sua-tam/c4.html
            const products = await productModel.getBy(conds, sorts, page, item_per_page);

            const categories = await categoryModel.all();

            const allProducts = await productModel.getBy(conds, sorts);

            const totalPage = Math.ceil(allProducts.length / item_per_page); //để phân trag

            const featured = {
                1: 'Nổi bật',
                0: 'Không nổi bật'
            }


            res.render('admin/product/index', {
                featured: featured,
                products: products,
                totalPage: totalPage,
                page: page,
                categories: categories,
                layout: 'admin/layout',
                search: search
            });
        } catch (error) {
            res.status(500).send(error.message);
        }
    }

    static create = async (req, res) => {
        const categories = await categoryModel.all();
        const brands = await brandModel.all();
        try {
            res.render('admin/product/create', {
                categories: categories,
                brands: brands,
                layout: 'admin/layout',
            });
        } catch (error) {
            res.status(500).send(error.message);
        }
    }

    static store = async (req, res) => {
        try {
            const { fields, files } = await req.app.locals.helpers.parseForm(req);
            const oldpath = files.img[0].filepath;
            const newpath = req.app.locals.uploadDir + '/' + files.img[0].originalFilename;
            await req.app.locals.helpers.copyFile(oldpath, newpath);
            const data = {
                barcode: fields.barcode[0],
                sku: fields.sku[0],
                name: fields.name[0],
                price: fields.price[0],
                discount_percentage: fields.discount_percentage[0],
                discount_from_date: fields.discount_from_date[0],
                discount_to_date: fields.discount_to_date[0],
                featured_image: files.img[0].originalFilename,
                inventory_qty: fields.inventory_qty[0],
                category_id: fields.category_id[0],
                brand_id: fields.brand_id[0],
                description: fields.description[0],
                created_date: req.app.locals.helpers.getCurrentDateTime(),
                featured: fields.featured[0]
            }
            await productModel.save(data);
            req.session.message_success = `Create product ${data.name} sucessfully!`;
            req.session.save(() => {
                res.redirect('/admin');
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static edit = async (req, res) => {
        try {
            const brands = await brandModel.all();
            const categories = await categoryModel.all();
            const product = await productModel.find(req.params.id);
            res.render('admin/product/edit', {
                brands: brands,
                categories: categories,
                product: product,
                layout: 'admin/layout',
            })
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static update = async (req, res) => {
        try {
            const { fields, files } = await req.app.locals.helpers.parseForm(req);
            const data = {
                barcode: fields.barcode[0],
                sku: fields.sku[0],
                name: fields.name[0],
                price: fields.price[0],
                discount_percentage: fields.discount_percentage[0],
                discount_from_date: fields.discount_from_date[0],
                discount_to_date: fields.discount_to_date[0],
                inventory_qty: fields.inventory_qty[0],
                category_id: fields.category_id[0],
                brand_id: fields.brand_id[0],
                description: fields.description[0],
                featured: fields.featured[0],
            };
            // If a new image is uploaded, handle the image upload and update the featured_image field
            if (files.img && files.img.length > 0) {
                const oldpath = files.img[0].filepath;
                const newpath = req.app.locals.uploadDir + '/' + files.img[0].originalFilename;
                await req.app.locals.helpers.copyFile(oldpath, newpath);
                data.featured_image = files.img[0].originalFilename;
            }

            await productModel.update(fields.id[0], data);

            // Update session message for success
            req.session.message_success = `Sửa thông tin sản phẩm ${data.name} thành công!`;
            req.session.save(() => {
                res.redirect('/admin');
            });
        } catch (error) {
            throw new Error(error.message);
        }
    };

    static destroy = async (req, res) => {
        try {
            const id = req.params.id;
            const product = await productModel.find(req.params.id);
            const orders = await orderItemModel.findByProductId(id);
            if (orders.length) {
                req.session.message_error = `Không thể xóa sản phẩm '${product.name}' vì có ${orders.length} đơn hàng đang chứa sản phẩm này!`;
                req.session.save(() => {
                    res.redirect('/admin');
                });
                return;
            }
            // xóa Comment
            await commentModel.destroyByProductId(id);
            //xóa hình trong imageItem(chi tiết)
            const imageItems = await product.getImageItems();
            for (let i = 0; i < imageItems.length; i++) {
                const imageItem = imageItems[i];
                const image = await imageItem.name;
                await req.app.locals.helpers.deleteFile(req.app.locals.uploadDir + '/' + image);
                await imageItemModel.destroy(imageItem.id);
            }
            //xóa hình table product
            await req.app.locals.helpers.deleteFile(req.app.locals.uploadDir + '/' + product.featured_image);
            //xóa product
            await productModel.destroy(id);
            req.session.message_success = `Xóa sản phẩm ${product.name} thành công!`;
            req.session.save(() => {
                res.redirect('/admin');
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }
    static trending = async (req, res) => {
        try {
            res.end('trending')
        } catch (error) {
            throw new Error(error.message);
        }
    }
}
module.exports = AdminProductController;