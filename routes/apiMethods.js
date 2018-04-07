var express = require('express'),
    router = express.Router(),
    _ = require('underscore'),
    db = require('../database/db');
var randomstring = require("randomstring");


router.get('/v1', (req,res) => {
	res.json({"status":"running successfully"})	
});

function generateRamndomString(){
	return randomstring.generate({
		length: 17,
		charset: 'alphanumeric'
	 });
}

function checkQueryExistance(req,res,next) {
  if(req.body && req.body.name){
    var body = req.body,
        name = req.body.name || '',
        rType = req.body.rType || '',
        fType = req.body.fType || '';
    if(name && rType && fType){
      db.get().collection('tables').find({ name: name,rType: rType,fType: fType,resturantId: 'IRu1bE3naGTMzLt'}).toArray(function (err,docs) {
        if(err) res.status(500).send('Internal Server Error - 1 !');
        if(docs && !_.isEmpty(docs)){
          req.isExist = docs;
        }
        next();
      })
    } else {
      next();
    }
  } else{
    next();
  }
}

function saveDistinctQuery(req,res,next) {
  if(req.body){
    if(req.isExist && !_.isEmpty(req.isExist)){
		res.status(200).send({
			code:2,
			message: 'Table is already Exist !'
		});
	} else if(req.body.tId){
      var tId = req.body.tId,
          body = req.body,
          updateObj = {
            name : body.name || '',
            rType : body.rType || '',
            fType : body.fType || '',
            uAt : new Date()
          };
      db.get().collection('tables').update({_id: tId},{$set:updateObj},function(err,docs){
        if(err) res.status(500).send('Internal server error !');
        console.log(JSON.stringify(docs));
        res.status(200).send({
					code: 0,
					message: 'Table stored successfully !',
					tableId: tId
				});

      })

    } else {
      var body = req.body,
          saveObj = {
            name : body.name || '',
            rType : body.rType || '',
            fType : body.fType || '',
            cAt : new Date(),
            resturantId: body.resturantId,
            isActive: true
          },
		  rndmId = generateRamndomString();
		saveObj._id = rndmId;
		db.get().collection('tables').insert(saveObj,function(err,docs){
			if(err) res.status(500).send('Internal server error !');
			res.status(200).send({
					code: 0,
					message: 'Table stored successfully !',
					tableId: docs.insertedIds
				});
		})

    }
  } else {
    res.status(200).send({
      code:1,
      message: 'Invalid Document !'
    });
  }
}

let removeBookingById = (match_query,res) => {
	db.get().collection('bookings').remove(match_query,function(err,result){
		if(err) res.status(500).send('Internal Server Error - 1 !');
		if(res) {
			res.status(200).send({
				code: 0,
				message: 'booking with ID '+match_query._id+' removed successfully !'
			});
		}
	})
}

router.post('/save-tables',checkQueryExistance,saveDistinctQuery);

router.post('/save-bookings',(req,res,next)=>{
	let data = req.body,
		email = data.email,
		tableId = data.tId,
		from_booking_datetime = new Date(data.bDt - 30*60000).getTime(),
		to_booking_datetime = new Date(data.bDt + 30*60000).getTime(),
		booking_id = data.bookingId,
		match_query = {};
	data.cAt = new Date().getTime();
	if(booking_id){
		match_query = { _id: booking_id };
	} else {
		match_query = {
			email: email,
			bDt: {
				$gt: from_booking_datetime,
				$lt: to_booking_datetime
			}
		};
	}

	db.get().collection('bookings').find(match_query).toArray(function(err,docs){
		if(err) res.status(500).send('Internal Server Error - 1 !');
		if(booking_id){
			removeBookingById(match_query);
		}
		if(!booking_id && docs && !_.isEmpty(docs)){
			res.status(203).send({
				code: 1,
				message: 'Already booking is there for the time approximate to this !',
				tableId: tableId,
				resturantId: docs[0].resturantId,
				bookingId: docs[0]._id
			});
    } else {
			var rndmId = generateRamndomString();
			data._id = rndmId;
					
			db.get().collection('bookings').insert(data,function(err,docs){
				if(err) res.status(500).send('Internal Server Error - 2 !');
				res.status(200).send({
					code: 0,
					message: 'booking done successfully !',
					bookingId: docs.insertedIds
				});
			})
    }
	})
});

router.delete('/remove_items',(req,res)=>{
	let collection = req.body && req.body.collection_name || '',
		itemIds = req.body && req.body.elementIds || '';
	if(collection && itemIds){
    
		db.get().collection(collection).remove({_id: {$in: itemIds} },(err,doc)=>{
			if(err) res.status(500).send('Internal Server Error - 1 !');
			res.json({
				code: 0,
				message: 'Deleted successfully !'
			});
		})
	}
})

let listBookings = (matchQuery,options) => {
	return new Promise((resolve,reject) => {
		db.get().collection('bookings').find(matchQuery,options).toArray((err,docs) => {
			if(err) reject(err);
			resolve(docs);
		})
	})
}
router.put('/modify_booking_status/:booking_id?',(req,res) => {
	let booking_id = req.params.booking_id || '',
		status = req.body.status || 'booked',
		match_query = {
			resturantId: 'IRu1bE3naGTMzLt',
			_id: booking_id		
		};
		status = status==='free'?'completed':status;
		let colmn = status+'At',
				update = {status: status};
		update[colmn] = new Date().getTime();

	db.get().collection('bookings').update(match_query,{$set: update},(err,doc) => {
		if(err) res.status(500).send('Internal Server Error - 1 !');
		res.status(200).send({
			code: 0,
			message: 'Booking updated successfully !'
		});
	})
})

router.get('/get_booking_info/:booking_id?',(req,res) => {
	let booking_id = req.params.booking_id || '',
			match_query = {
				resturantId: 'IRu1bE3naGTMzLt',
				_id: booking_id		
			};
	listBookings(match_query,{})
	.then(booking => {
		res.status(200).json({
			code: 0,
			message: 'booking info retrieved successfully !',
			info: booking
		})
	})
	.catch(errRes => {
		res.status(200).json({
			code: 2,
			message: 'something went wrong !'
		})
	})
});

router.get('/get_items/:collection',(req,res)=>{
	let collection = req.params.collection || '';
	if(collection){
		let matchQuery = {
			isActive:true,
			resturantId: 'IRu1bE3naGTMzLt'
		},
		options = {
			cAt: false,
			uAt: false,
			resturantId: false,
			isActive: false
		};

		listBookings({resturantId: 'IRu1bE3naGTMzLt',status:{$ne: 'completed' } },{status: 1,tId:1})
		.then((tableLsitwithStatus) => {
			db.get().collection(collection).find(matchQuery,options).toArray((err,docs)=> {
				if(err) res.status(500).send('Internal Server Error - 1 !');
				res.json({
					code: 0,
					message: 'collection retrieve successfully !',
					list: docs,
					tableStatus_withBookingId: tableLsitwithStatus
				});
			})
		})
		.catch((errRes) => {
			res.json({
				code: 9,
				message: 'something went wrong !',
				error: errRes
			});
		})
		
	} else {
		res.json({
			code: 1,
			message: 'collection name is not pressent.'
		});
	}
})
//404 - Page not found handler.
router.use(function(req,res,next){
	res.json({"status":"failed","err":"404"});
});



module.exports = router;
