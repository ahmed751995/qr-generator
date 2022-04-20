// Copyright (c) 2022, ahmed and contributors
// For license information, please see license.txt
frappe.require([
    'assets/sap/js/mqtt.min.js'
]);

frappe.ui.form.on('Product Order', {
    
    generate: function(frm) {
	const items = parseInt(frm.doc.rolls_no);
	for(let i = 0; i < items; i++) {
	    frm.add_child('product_details', {
		quantity: parseFloat(frm.doc.quantity / items),
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
	// frm.doc.selected_row = frm.selected_doc.idx;
	let row = frm.selected_doc.idx;
	if(frm.doc.__unsaved == 1) {
	    frm.save();
	}
	async function wait_saving() {
	    while(frm.doc.__unsaved == 1) {
		await sleep(500);
	    }
	    frm.doc.selected_qr = frm.doc.product_details[row - 1].qr_code
	    frm.print_doc();
	}
	wait_saving();
    },
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
