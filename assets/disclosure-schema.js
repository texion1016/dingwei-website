/* 鼎瑋不動產說明書欄位定義：編輯頁與列印頁共用。 */
window.DW_DISCLOSURE_SECTIONS = [
  { id:'base', title:'封面與基本資料', fields:[
    ['doc_no','不動產說明書編號','text'], ['prepared_date','製作日期','date'],
    ['case_name','銷售案名／物件名稱','text'], ['deal','交易種類','select',['買賣','租賃']],
    ['doorplate','建物門牌','text'], ['office_checked','本說明書係依何地政事務所核發謄本','text'],
    ['company_name','製作單位','text'], ['company_address','公司地址','text'], ['company_tel','公司電話','text'],
    ['broker_name','經紀人','text'], ['broker_license','經紀人證號','text'], ['agent_name','營業員','text'], ['agent_license','營業員證號','text'], ['store_manager','店長','text']
  ]},
  { id:'attachments', title:'附件與簽收', groups:[
    {title:'主要內容', fields:[
      ['attach_title_check','產權調查篇（必要）','check'], ['attach_condition_check','物件現況調查篇（必要）','check'], ['attach_environment','位置與環境圖','check'], ['attach_photo_notes','圖片說明篇','check']
    ]},
    {title:'附件內容', fields:[
      ['attach_land_deed','土地權狀影本','check'], ['attach_building_deed','建物權狀影本','check'], ['attach_land_transcript','土地謄本（必要）','check'], ['attach_building_transcript','建物謄本（必要）','check'], ['attach_zoning','都市使用分區證明','check'], ['attach_permit','建築改良物使用執照','check']
    ]},
    {title:'其他附件', fields:[
      ['attach_terrain','地籍圖','check'], ['attach_plan','建物平面圖','check'], ['attach_seasand','海砂檢測報告','check'], ['attach_radiation','輻射檢測報告','check'], ['attach_manual','公寓大廈使用手冊','check'], ['attach_rules','住戶規約','check'], ['attach_division','分管協議','check'], ['attach_parking_plan','車位平面圖','check'], ['attach_city_plan','都市計畫說明書','check'], ['attach_other_rights','不動產標的現況說明書','check']
    ]},
    {title:'簽收欄', fields:[
      ['seller_name','賣方／出租方姓名','text'], ['seller_address','賣方／出租方住址','text'], ['seller_date','賣方／出租方日期','date'], ['buyer_name','買方／承租方姓名','text'], ['buyer_address','買方／承租方住址','text'], ['buyer_date','買方／承租方日期','date'], ['buyer_sign_log','買方客戶簽收紀錄（每行：日期｜客戶姓名｜經紀人）','textarea']
    ]}
  ]},
  { id:'rights', title:'產權調查篇', groups:[
    {title:'土地標示（河底段）', fields:[
      ['land_location','座落／段小段','text'], ['land_lot','地號','text'], ['land_base_area','基地面積（坪）','text'], ['land_right_range','權利範圍','text'], ['land_category','地目','text'], ['land_zoning','使用分區','text'], ['land_total_area','面積共計（坪／平方公尺）','text']
    ]},
    {title:'建物標示', fields:[
      ['building_location','建物座落／區段','text'], ['building_no','建號','text'], ['building_doorplate','門牌','text'], ['main_area','主建物面積（坪）','text'], ['attached_purpose','附屬建物用途','text'], ['attached_area','附屬建物面積（坪）','text'], ['common_no','共有部分建號','text'], ['common_area','共有部分面積（坪）','text'], ['common_share','共有部分持分','text'], ['total_area','面積共計（坪／平方公尺）','text'], ['public_ratio','公設比','text'], ['completion_date','建物完成日','text'], ['building_use','用途','text']
    ]},
    {title:'權利登記與限制', fields:[
      ['building_other_rights','建物他項權利登記（每行：權利種類｜順位｜登記日期｜設定金額｜權利人）','textarea'], ['land_other_rights','土地他項權利登記（每行：權利種類｜順位｜登記日期｜設定金額｜權利人）','textarea'], ['restriction_notice','預告登記','check'], ['restriction_seizure','查封','check'], ['restriction_fake_mortgage','假扣押／假處分','check'], ['restriction_other','其他限制登記','text'], ['restriction_note','處理方式說明','textarea']
    ]},
    {title:'停車位權利調查', fields:[
      ['parking_registered','是否辦理獨立區分所有建物登記','select',['無','有']], ['parking_agreement','使用約定','text'], ['parking_type','停車位型式','select',['','平面式','機械式']], ['parking_no','停車位編號','text']
    ]}
  ]},
  { id:'condition', title:'物件現況調查篇', groups:[
    {title:'土地／使用及管制', fields:[
      ['land_proportional_use','是否有依慣例使用之現況','select',['無','依分管協議使用','依慣例使用、無分管協議']], ['land_rented','土地有無出租或占用','select',['無出租','有出租','有占用','無占用']], ['land_rent_expiry','租約屆滿日','text'], ['urban_use','都市計畫土地使用分區','select',['','住宅區','商業區','工業區','其他']], ['legal_coverage','法定建蔽率（%）','text'], ['legal_far','法定容積率（%）','text'], ['development_limit','開發方式有無限制','select',['無','有']], ['development_limit_note','限制內容','textarea']
    ]},
    {title:'公寓大廈規約與共用', fields:[
      ['rules_unregistered_reason','無法登記規約內容之原因','textarea'], ['rules_scope_proprietary','專有部分範圍','textarea'], ['rules_scope_common','共用部分範圍','textarea'], ['rules_agreed_use','約定專用部分及內容','textarea'], ['rules_management','管理費／使用費／服務費額','textarea'], ['rules_fund','公共基金金額及運用方式','textarea'], ['rules_organization','管理組織及管理方式','textarea'], ['rules_manual','有無使用手冊','text'], ['common_proportional_use','共用部分是否有依慣例使用','select',['無','依分管協議使用','依慣例使用、無分管協議']]
    ]},
    {title:'水電瓦斯與使用', fields:[
      ['water','水','select',['','自來水','地下水']], ['electricity','電','select',['','有獨立電錶','無獨立電錶']], ['gas','瓦斯','select',['','天然','桶裝','無']], ['building_rented','建物有無出租或占用','select',['無出租','有出租','有占用','無占用']], ['building_rent_expiry','建物租約屆滿日','text']
    ]}
  ]},
  { id:'exterior', title:'建築外觀說明', groups:[
    {title:'基本資料', fields:[
      ['property_type','物件種類','text'], ['transaction_status','交屋情形','select',['','立即','商談']], ['condition_status','現況','text'], ['parking_info','車位','text'], ['layout_detail','格局','text'], ['management_fee','管理費','text'], ['security','警衛管理','text'], ['courtyard','中庭花園','text'], ['main_material','主要建材','text'], ['direction','朝向','text'], ['exterior_material','外牆外飾','text'], ['floor_material','地板','text'], ['nearby','附近設施','textarea'], ['transportation','交通條件','textarea'], ['feature_notes','特色說明','textarea']
    ]},
    {title:'實景照片（由案件既有照片選擇）', fields:[
      ['photo_1','實景照片一','photo'], ['photo_2','實景照片二','photo'], ['photo_3','實景照片三','photo'], ['photo_4','實景照片四','photo']
    ]},
    {title:'週邊半徑 300 公尺重要環境設施', fields:[
      ['amenity_park','公（私）有市場','check'], ['amenity_supermarket','超級市場','check'], ['amenity_school','學校','check'], ['amenity_police','警察局（分駐所、派出所）','check'], ['amenity_office','行政機關','check'], ['amenity_stadium','體育場','check'], ['amenity_hospital','醫院','check'], ['amenity_garbage','垃圾場／掩埋場','check'], ['amenity_radio','電信發射台','check'], ['amenity_highway','高速／快速道路','check'], ['amenity_temple','寺廟','check'], ['amenity_funeral','公墓','check'], ['amenity_crematorium','火化場','check'], ['amenity_grave','骨灰（骸）存放設施','check'], ['amenity_incinerator','垃圾場（掩埋場、焚化場）','check'], ['amenity_private_cemetery','顯見之私人墳墓','check'], ['amenity_gas_station','加油（氣）站','check'], ['amenity_rail','鐵路','check'], ['amenity_mrt','捷運站','check']
    ]}
  ]},
  { id:'terms', title:'重要交易條件及瑕疵', groups:[
    {title:'交易條件及付款方式', fields:[
      ['trade_type','交易種類','select',['買賣','租賃']], ['commission_total','委託總價（萬）','text'], ['commission_detail','土地房屋／車位／車位另購合計說明','text'], ['parking_value','停車位計價','text'], ['payment_1','第一期款（簽約款）金額','text'], ['payment_1_percent','第一期款占總價（%）','text'], ['payment_2','第二期款（備證用印款）金額','text'], ['payment_2_percent','第二期款占總價（%）','text'], ['payment_3','第三期款（完稅款）金額','text'], ['payment_3_percent','第三期款占總價（%）','text'], ['payment_4','第四期款（交屋款）金額','text'], ['payment_4_percent','第四期款占總價（%）','text'], ['tax_land_gain','土地增值稅（約元）','text'], ['tax_deed','契稅（約元）','text'], ['tax_house','房屋稅（約元）','text'], ['tax_stamp','印花稅（約元）','text'], ['expense_note','規費及負擔方式說明','textarea']
    ]},
    {title:'建築改良物瑕疵情形', fields:[
      ['sea_sand','海砂檢測','select',['無','有（詳如附件檢測報告）']], ['radiation','輻射檢測','select',['無','有（詳如附件檢測報告）']], ['leak','滲漏水情形及其位置','textarea'], ['damage','損鄰狀況','textarea'], ['illegal_addition','有無違建','select',['無','有']], ['unregistered_building','有無未建權事','select',['無','有']], ['fire_disaster','是否曾發生火災或天然災害','textarea'], ['dangerous_building','是否現階段被建管單位列為危險建築','select',['否','是']], ['unnatural_death','是否曾發生自殺、自殺、一氧化碳中毒或其他非自然死亡','select',['否','是']], ['landslide_zone','是否為正府列管山坡地住宅社區','select',['否','是']]
    ]},
    {title:'賣方附贈設備（可複選）', fields:[
      ['gift_lights','燈飾','check'], ['gift_seat','座','check'], ['gift_bed','床組','check'], ['gift_dressing','梳妝台','check'], ['gift_wardrobe','窗簾／衣櫃','check'], ['gift_stove','瓦斯爐','check'], ['gift_hood','抽油煙機','check'], ['gift_water_heater','熱水器','check'], ['gift_fridge','冰箱','check'], ['gift_washer','洗衣機','check'], ['gift_sofa','沙發組','check'], ['gift_table','茶几／餐桌組','check'], ['gift_ac','冷氣機','check'], ['gift_tv','電視台','check'], ['gift_phone','電話','check'], ['gift_stereo','音響組','check'], ['gift_other','其他附贈設備','text']
    ]}
  ]},
  { id:'summary', title:'建物調查表', groups:[
    {title:'內部調查表資料', fields:[
      ['assigned','承辦／店長','text'], ['developer','建商','text'], ['households','戶數','text'], ['unit_price','單價（萬）','text'], ['monthly_rent','委託月租（萬）','text'], ['deposit','押金','text'], ['registered_area','登記坪數','text'], ['land_area','土地面積','text'], ['house_area','房屋坪數','text'], ['parking_count','車位坪數（含）','text'], ['sales_floor','銷售樓層','text'], ['viewing_method','帶看方式','text'], ['bus_stop','公車站名','text'], ['market','市場','text'], ['school_zone','學區','text'], ['park','公園','text'], ['front_road','面前巷道（米）','text'], ['agent_note','經紀人／證號','text']
    ]},
    {title:'重點說明', fields:[['summary_features','重點說明（每行一項）','textarea']]}
  ]},
  { id:'map', title:'週邊地圖', fields:[
    ['map_date','地圖列印日期','date'], ['latitude','緯度','text'], ['longitude','經度','text'], ['map_radius','地圖範圍','select',['週邊半徑300公尺','週邊半徑500公尺','週邊半徑1公里']], ['map_note','地圖備註','textarea']
  ]},
  { id:'sale_sheet', title:'售屋資料表', groups:[
    {title:'案件與開價', fields:[
      ['doc_no','委託書編號／編號','text'], ['case_name','案名','text'], ['commission_total','售價（萬）','text'], ['sales_floor','樓層','text'], ['layout_detail','格局','text'], ['parking_info','車位','text'], ['doorplate','地址','text']
    ]},
    {title:'權利範圍與建物狀況', fields:[
      ['registered_area','登記總面積／建物合計','text'], ['land_area','土地面積','text'], ['land_right_range','權利範圍','text'], ['land_base_area','基地面積','text'], ['main_area','主建物','text'], ['attached_area','附屬建物','text'], ['common_area','公共設施','text'], ['public_ratio','公設比','text'], ['completion_date','完成日期','text'], ['main_material','主要建材','text'], ['building_insulation','隔間材料','text'], ['floor_material','地板','text'], ['direction','座向','text']
    ]},
    {title:'付款條件與貸款', fields:[
      ['payment_1_percent','簽約款（%）','text'], ['payment_2_percent','備證（%）','text'], ['payment_3_percent','完稅（%）','text'], ['payment_4_percent','尾款（%）','text'], ['loan_bank','銀行設定（萬）','text'], ['loan_actual','實際貸款約（萬）','text']
    ]},
    {title:'使用狀況與生活機能', fields:[
      ['water','自來水','select',['','有','無']], ['gas','天然瓦斯','select',['','有','無']], ['electricity','獨立電表','select',['','有','無']], ['management_fee','管理費','text'], ['management_unit_fee','每坪管理費（元）','text'], ['management_total_fee','管理費合計（元）','text'], ['school_zone','學區','text'], ['market','市場','text'], ['park','公園','text'], ['transportation','交通／站牌','textarea']
    ]},
    {title:'本案特色', fields:[['summary_features','本案特色','textarea']]},
    {title:'位置圖與平面圖', fields:[['sale_location_map','位置圖','image'], ['sale_floor_plan','平面圖','image']]},
    {title:'備註、附贈物與確認', fields:[
      ['sale_remarks','備註','textarea'], ['gift_summary','附贈物／現況','textarea'], ['inspection_status','驗屋','select',['未驗','已驗']], ['buyer_confirm','買方確認','select',['未確認','已確認']], ['seller_confirm','賣方確認','select',['未確認','已確認']], ['store_manager','主管','text'], ['broker_name','經紀人','text'], ['agent_name','營業員','text']
    ]}
  ]}
];

window.DW_DISCLOSURE_PAGE_ORDER = ['cover','attachments','rights','condition','exterior','terms','summary','map','sale_sheet'];
