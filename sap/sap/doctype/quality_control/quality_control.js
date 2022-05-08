// Copyright (c) 2022, ahmed and contributors
// For license information, please see license.txt

frappe.ui.form.on('Quality Control', {
	refresh: function(frm) {
	    frappe.call({
		method: 'sap.api.get_items_wait_quality',
		callback: function(r) {
		    let  items= r.message;
		    frm.doc.product_items = [];
		    items.forEach(item => {
			frm.add_child('product_items', {
			    row_no: item.row_no,
			    bullet_no: item.bullet_no,
			    quantity: item.item_quantity,
			    growth_weight: item.growth_weight,
			    net_weight: item.net_weight,
			    item_status: item.item_status,
			    document_no: item.document_no,
			    item_group: item.item_group,
			    item_no: item.item_no,
			    customer_no: item.customer_no,
			    customer_name: item.customer_name,
			    product_quantity: item.quantity,
			    product_length: item.length,
			    product_width: item.product_width,
			    item_serial: item.items_serial,
			    product_weight: item.weight,
			    product_thickness: item.thickness,
			    product_core_type: item.core_type,
			    product_core_weight: item.core_weight,
			    product_total_weight: item.total_weight,
			    application: item.application,
			    scaler: item.scaler,
			    item_name: item.name,
			});
		    });
		    refresh_field("product_items");
		}
	    })
	},
    before_save: function(frm) {
	frappe.throw("Only refresh the doc");
    }
});

frappe.ui.form.on("Quality Control Details", {
    quality_status: function(frm){
	frappe.call({
	    method: 'sap.api.update_item_quality',
	    args: {
		name: frm.selected_doc.item_name,
		status: frm.selected_doc.quality_status,
		qt_inspection: frm.selected_doc.qt_inspection || ""
	    },
	});
    },
    qt_inspection: function(frm) {
	if(frm.selected_doc.qt_inspection)
	    frappe.call({
		method: 'frappe.client.get',
		args: {
		    doctype: 'Quality Inspection',
		    name: frm.selected_doc.qt_inspection
		},
		callback: function(r) {
		    frappe.model.set_value('Quality Control Details', frm.selected_doc.name, 'quality_status', r.message.status);
		    refresh_field("product_items");
		}
	    });
    }
});
