const session = require('express-session');
const customerModel = require('../../models/Customer');
const orderModel = require('../../models/Order');

class AdminCustomerController {
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
                //select * from view_customer where name like '%kem%'
            }
            // /danh-muc/sua-tam/c4.html
            const customers = await customerModel.getBy(conds, sorts, page, item_per_page);

            const allCustomers = await customerModel.getBy(conds, sorts);

            const totalPage = Math.ceil(allCustomers.length / item_per_page); //để phân trag


            res.render('admin/customer/index', {
                customers: customers,
                totalPage: totalPage,
                page: page,
                layout: 'admin/layout',
                search: search
            });
        } catch (error) {
            res.status(500).send(error.message);
        }
    }


    static create = (req, res) => {
        try {
            res.end('create')
        } catch (error) {
            res.status(500).send(error.message);
        }
    }

    static store = async (req, res) => {
        try {
            res.end('store')
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static edit = async (req, res) => {
        try {
            const customer = await customerModel.find(req.params.id);
            res.render('admin/customer/edit', {
                layout: 'admin/layout',
                customer: customer,
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static update = async (req, res) => {
        try {
            const id = req.body.id;
            await customerModel.update(id, {
                name: req.body.name,
                mobile: req.body.mobile,
                email: req.body.email,
                shipping_name: req.body.shipping_name,
                shipping_mobile: req.body.shipping_mobile,
                housenumber_street: req.body.housenumber_street,
                is_active: req.body.is_active
            });
            // Update session message for success
            req.session.message_success = `Sửa thông tin khách hàng '${req.body.name}' thành công!`;
            req.session.save(() => {
                res.redirect('/admin/customer');
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static destroy = async (req, res) => {
        try {
            const id = req.params.id;
            const customer = await customerModel.find(id);
            const orders = await orderModel.getByCustomerId(id);
            if (orders.length) {
                req.session.message_error = `Không thể xóa khách hàng '${customer.name}' vì có ${orders.length} đơn hàng được đặt!`;
                await req.session.save(() => {
                    return res.redirect('/admin/customer');
                });
            } else {
                await customerModel.destroy(id);
                req.session.message_success = `Xóa khách hàng '${customer.name}' thành công!`;
                await req.session.save(() => {
                    res.redirect('/admin/customer');
                });
            }
        } catch (error) {
            throw new Error(error.message);
        }
    };

}
module.exports = AdminCustomerController;