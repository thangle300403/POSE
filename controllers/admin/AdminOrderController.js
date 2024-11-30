const session = require('express-session');
const orderModel = require('../../models/Order');
const orderItemModel = require('../../models/OrderItem');
const statusModel = require('../../models/Status');

class AdminOrderController {
    static index = async (req, res) => {
        try {
            const page = req.query.page || 1;
            const item_per_page = process.env.PRODUCT_ITEM_PER_PAGE;
            let conds = {};
            let sorts = {};

            const search = req.query.search;
            if (search) {
                // Searching by shipping_fullname
                conds.shipping_fullname = {
                    type: 'LIKE',
                    val: `'%${search}%'`
                };
            }
            // /danh-muc/sua-tam/c4.html

            const orders = await orderModel.getBy(conds, sorts, page, item_per_page);

            const statuses = await statusModel.all();

            const allOrders = await orderModel.getBy(conds, sorts);

            const totalPage = Math.ceil(allOrders.length / item_per_page); //để phân trag

            for (let i = 0; i <= orders.length - 1; i++) {
                orders[i].orderItems = await orders[i].getOrderItems();
                orders[i].status = await orders[i].getStatus();
                for (let j = 0; j <= orders[i].orderItems.length - 1; j++) {
                    orders[i].orderItems[j].product = await orders[i].orderItems[j].getProduct();
                }
                orders[i].total_price = await orders[i].getSubTotalPrice();
            }

            res.render('admin/order/index', {
                statuses: statuses,
                orders: orders,
                totalPage: totalPage,
                page: page,
                layout: 'admin/layout',
                search: search
            });
        } catch (error) {
            res.status(500).send(error.message);
        }
    }
    static changeOrderStatus = async (req, res) => {
        try {
            const orderId = req.body.id; // Get the order ID from the request body
            const orderStatusId = req.body.order_status; // Get the new status ID

            const order = await orderModel.find(orderId);
            const status = await order.getStatus();

            let updated = false;
            if (status.name !== 'delivered' && status.name !== 'canceled') {
                updated = await orderModel.update(orderId, { order_status_id: orderStatusId });
            }

            if (updated) {
                req.session.message_success = 'Cập nhật trạng thái đơn hàng số ' + orderId + ' thành công';
            } else {
                req.session.message_error = `Đơn hàng số ${orderId} đang ở trạng thái: ${status.description}, không thay đổi được!`;
            }
            // Redirect back to the order list or render a response
            req.session.save(() => {
                res.redirect('/admin/order'); // Redirect to the order index page
            });
        } catch (error) {
            res.status(500).send(error.message);
        }
    }

    static destroy = async (req, res) => {
        try {
            const id = req.params.id;
            const order = await orderModel.find(id);
            const status = await order.getStatus();
            if (status.name === 'ordered' || status.name === 'confirmed' || status.name === 'delivered' || status.name === 'canceled') {
                await orderItemModel.destroyByOrderId(id);
                await orderModel.destroy(id);
                req.session.message_success = `Xóa đơn hàng số ${id} thành công!`;
            } else {
                req.session.message_error = `Đơn hàng số ${id} đã qua xác nhận nhưng chưa được giao đến địa chỉ, không thể xóa!`;
            }
            req.session.save(() => {
                res.redirect('/admin/order');
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }
}
module.exports = AdminOrderController;