// Copyright (c) 2022, ahmed and contributors
// For license information, please see license.txt
frappe.require([
    'assets/sap/js/mqtt.min.js'
]);

frappe.ui.form.on('Product Order', {
    
    generate: function(frm) {
	let items = parseInt(frm.doc.rolls_no);
	for(let i = 0; i < items; i++) {
	    frm.add_child('product_details', {
		quantity: parseFloat(frm.doc.quantity / items),
		row_no: `${frm.doc.document_no}-${i}`
	    });
	}
	refresh_field('product_details');
    },
     send_to_sap: function(frm) {
	 frm.doc.product_details.forEach((product) => {
	     product.item_status = "Sent to SAP";
	 });
	 Object.keys(frm.doc).forEach(doc => {
	     frm.set_df_property(doc, "read_only", 1);
	 });
	 refresh_field("product_details");
	 frm.save();
     },
    change_roll_status: function(frm) {
	let d = new frappe.ui.Dialog({
	    title: 'Rolls Status',
	    fields: [
		{label: 'Select All Rows',fieldname: 'select_all',fieldtype: 'Button'},
		{fieldtype: 'Column Break' },
		{label: 'Range',fieldname: 'range',fieldtype: 'Button'},
		{fieldtype: 'Column Break' },
		{label: 'Custom Rows',fieldname: 'custom_rows',fieldtype: 'Button'},
		{fieldtype: 'Column Break' },
		{label: 'Bullet No',fieldname: 'bullet_number',fieldtype: 'Button'},
		{fieldtype: 'Section Break' },
		{label: 'From Row',fieldname: 'from_row',fieldtype: 'Int',description: 'enter row number'},
		{label: 'to Row',fieldname: 'to_row',fieldtype: 'Int'},
		{label: 'Rows', fieldname: 'rows',fieldtype: 'Data',description: 'enter row number separated by comma ex: 2,4',hidden: 1},
		{label: 'Bullet No',fieldname: 'bullet_no',fieldtype: 'Data',hidden: 1},
		{label: 'Status',fieldname: 'row_status',fieldtype: 'Select',options: ['', 'Accepted', 'Rejected'],reqd: 1},
		{label: '',fieldname: 'selected_but',fieldtype: 'Data', hidden: 1, default_value: 'range'}
	    ],
	    primary_action_label: 'Submit',
	    primary_action(values) {
		console.log(values);
		
		let items = frm.doc.product_details;
		
		if(values.selected_but == "custom_rows") {
		    let rows = values.rows.split(',');
		    try{
			for(let r of rows)
			    items[parseInt(r)-1].roll_status = values.row_status;
		    } catch(e) {
			frappe.throw("Check row number")
		    }
		}
		else if(values.selected_but == "bullet_number") {
		    items.forEach(item => {
			if(item.bullet_no == values.bullet_no)
			    item.roll_status = values.row_status;
		    });
		}
		else if(values.selected_but == "select_all") {
		     for(let i = 0; i < items.length; i++)
			 items[i].roll_status = values.row_status;
		}
		else {
		    try {
			for(let i = values.from_row - 1; i < values.to_row; i++)
			    items[i].roll_status = values.row_status;
		    } catch(e) {
			frappe.throw("Check row numbers")
		    }
		}


		d.hide();
		refresh_field("product_details");

	    }
	});
	d.fields_dict['select_all'].onclick = () => {
	    cur_dialog.set_df_property('from_row', "hidden", 1);
	    cur_dialog.set_df_property('to_row', "hidden", 1);
	    cur_dialog.set_df_property('bullet_no', "hidden", 1);
	    cur_dialog.set_df_property('rows', "hidden", 1);
	    cur_dialog.fields_dict['selected_but'].set_value('select_all');
	}
	d.fields_dict['range'].onclick = () => {
	    cur_dialog.set_df_property('from_row', "hidden", 0);
	    cur_dialog.set_df_property('to_row', "hidden", 0);
	    cur_dialog.set_df_property('bullet_no', "hidden", 1);
	    cur_dialog.set_df_property('rows', "hidden", 1);
	    cur_dialog.fields_dict['selected_but'].set_value('range');
	}
	d.fields_dict['custom_rows'].onclick = () => {
	    cur_dialog.set_df_property('from_row', "hidden", 1);
	    cur_dialog.set_df_property('to_row', "hidden", 1);
	    cur_dialog.set_df_property('bullet_no', "hidden", 1);
	    cur_dialog.set_df_property('rows', "hidden", 0);
	    cur_dialog.fields_dict['selected_but'].set_value('custom_rows');
	}
	d.fields_dict['bullet_number'].onclick = () => {
	    cur_dialog.set_df_property('from_row', "hidden", 1);
	    cur_dialog.set_df_property('to_row', "hidden", 1);
	    cur_dialog.set_df_property('bullet_no', "hidden", 0);
	    cur_dialog.set_df_property('rows', "hidden", 1);
	    cur_dialog.fields_dict['selected_but'].set_value('bullet_number');
	}
	d.show();
    },
    print_selected_bullet: function(frm) {
	doc_is_instantiated(frm);
	if(frm.doc.__unsaved == 1) {
	    frm.save().then(() => {
		print_selected_doc();
	    });
	} else {
	    print_selected_doc();
	}
	
	function print_selected_doc(frm) {
	    frm.doc.selected_product = [];
	    let i = 1;
	    frm.doc.product_details.forEach(product => {
		if(product.bullet_no == frm.doc.selected_bullet_no) {
		    frm.doc.selected_product.push({...product, idx: i});
		    i += 1;
		}
	    })
	    frm.print_doc();
	}
    }
});

frappe.ui.form.on('Product Order Details', {
    measure: function(frm) {
	const options = {
            clean: true, // retain session
	    connectTimeout: 3000, // Timeout period increased to 30 seconds
	    // Authentication information
	    // clientId: 'foobar_test_random' + Math.floor(Math.random() * 10000),
	}
	const connectUrl = 'wss://test.mosquitto.org:8081'
	const client = mqtt.connect(connectUrl,options)

	//actually subscribe to something on a sucessfull connection
	client.on('connect', (connack) => {
	    if(frm.selected_doc.scaler)
		client.subscribe(frm.selected_doc.scaler);
	})

	client.on('reconnect', (error) => {
	    console.log('reconnecting:', error)
	})

	client.on('error', (error) => {
	    console.log('Connection failed:', error)
	})

	client.on('message', (topic, message) => {
	    frm.selected_doc.net_weight =  message.toString()
	    refresh_field('product_details')
	    client.unsubscribe(frm.selected_doc.scaler)
	})
    },
    print_qr: function(frm) {
	doc_is_instantiated(frm);
	let row = frm.selected_doc.idx;
	if(frm.doc.__unsaved == 1) {
	    frm.save().then(() => {
		print_product_details(frm, row);
	    });
	} else {
	    print_product_details(frm, row);
	}
	
	function print_product_details(frm, row) {
	    frm.doc.selected_qr = frm.doc.product_details[row - 1].qr_code;
	    frm.doc.product_details[row-1].item_status = "Printed"
	    refresh_field("product_details")
	    frm.print_doc();
	}
    },
    
    qt_inspection: function(frm) {
	frappe.call({
	    method: 'frappe.client.get',
	    args: {
		doctype: 'Quality Inspection',
		name: frm.selected_doc.qt_inspection
	    },
	    callback: function(r) {
		frm.selected_doc.roll_status = r.message.status;
		refresh_field("product_details");
	    }
	});

    }
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function doc_is_instantiated(frm) {
    let name = frm.doc.name.split("-");
    if(name[0] !== "PO")
	frappe.throw("Save the Doc to generate qr code");
}
