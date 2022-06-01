// Copyright (c) 2022, ahmed and contributors
// For license information, please see license.txt
frappe.require([
    'assets/sap/js/mqtt.min.js'
]);

frappe.ui.form.on('Product Order', {
    generate: function(frm) {
	let items = parseInt(frm.doc.rolls_no);
	let index;
	if(frm.doc.product_details) index = frm.doc.product_details.length;
	else index = 0;
	
	for(let i = index; i < items + index; i++) {
	    frm.add_child('product_details', {
		item_quantity: parseFloat(frm.doc.quantity / items),
		row_no: `${frm.doc.document_no}-${i+1}`,
		reference: `${frm.doc.length}-${frm.doc.width}-${frm.doc.total_weight}`
	    });
	}
	refresh_field('product_details');
    },
     send_to_sap: function(frm) {
	 frm.doc.product_details.forEach((product) => {
	     frappe.model.set_value('Product Order Details', product.name,'item_status', "Sent to SAP")
	     // product.item_status = "Sent to SAP";
	 });
	 // Object.keys(frm.doc).forEach(doc => {
	 //     frm.set_df_property(doc, "read_only", 1);
	 // });
	 refresh_field("product_details");
     },
    print_selected_bullet: function(frm) { // stop here
	doc_is_instantiated(frm);
	if(!frm.doc.docstatus)
	    frm.doc.product_details.forEach(product => {
		frappe.model.set_value('Product Order Details', product.name,'item_status', "Waiting Quality");
	    });

	let d = new frappe.ui.Dialog({
	    title: 'Enter Bullet Number',
	    fields: [
		{label: 'Bullet No',fieldname: 'bullet_no',fieldtype: 'Data'},

	    ],
	    primary_action_label: 'Print',
	    primary_action(values) {
		frm.doc.selected_bullet_no = values.bullet_no;
		print_selected_doc(frm);
		
		d.hide();
	    }
	});

	d.show()
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
    },
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
	if(frm.selected_doc.item_status !== "Inspected") {
	    frappe.model.set_value('Product Order Details', frm.selected_doc.name,'item_status', "Waiting Quality")
		.then(() => {
		    if(frm.doc.__unsaved == 1) {
			frm.save().then(() => {
			    print_product_details(frm, row);
			});
		    } else {
			print_product_details(frm, row);
		    }
		});
	} else {
	    print_product_details(frm, row);
	}
	


	// frappe.call({
	//     method: 'sap.api.send_to_quality',
	//     args: {
	// 	'doc': frm.doc.name,
	// 	'row_no': frm.selected_doc.row_no,
	// 	'index': frm.selected_doc.idx
	//     },
	//     callback: function(r) {
	// 	console.log("done")
	//     }
	// })
	
	function print_product_details(frm, row) {
	    frm.doc.selected_qr = frm.doc.product_details[row - 1].qr_code;
	    // frm.doc.product_details[row-1].item_status = "Waiting Quality"
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
		// frm.selected_doc.quality_status = r.message.status;
		frappe.model.set_value('Product Order Details', frm.selected_doc.name, 'quality_status', r.message.status);
		refresh_field("product_details");
	    }
	});

    },
    get_indicator: function (frm) {
	return [__(frm.doc.product_details.quality_status), {
	    "Rejected": "red",
	    "Accepted": "green",
	}[frm.doc.product_details.quality_status], "quality_status,=," + frm.doc.product_details.quality_status];
    }
});


function doc_is_instantiated(frm) {
    // let name = frm.doc.name.split("-");
    if(frm.doc.__unsaved)
	frappe.throw("Save the Doc to generate qr code");
}
