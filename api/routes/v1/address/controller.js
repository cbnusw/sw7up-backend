const axios = require('axios');
const qs = require('qs');
const proj4 = require('proj4');
const { createResponse } = require('../../../../shared/utils/response');
const { ADDRESS_API_KEY, COORDINATES_API_KEY } = require('../../../../shared/env');
const {
  COORDINATES_NOT_FOUND,
  INVALID_PARAMETER,
} = require('../../../../shared/errors');

const ADDRESS_API_URL = 'http://www.juso.go.kr/addrlink/addrLinkApiJsonp.do';
const COORDS_API_URL = 'http://www.juso.go.kr/addrlink/addrCoordApiJsonp.do';

const getAddresses = async (req, res, next) => {
  let { q: keyword, page: currentPage, limit: countPerPage } = req.query;

  if (!(keyword || '').trim()) return next(INVALID_PARAMETER);

  currentPage = +(currentPage || 1);
  countPerPage = +(countPerPage || 10);

  try {
    const response = await axios({
      method: 'post',
      url: ADDRESS_API_URL,
      data: { confmKey: ADDRESS_API_KEY, keyword, currentPage, countPerPage, resultType: 'json' },
      transformRequest: [data => qs.stringify(data)],
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const obj = JSON.parse(response.data.replace(/^\(/, '').replace(/\)$/, '')).results;

    const documents = (obj.juso || []).map(doc => ({
      name: doc.jibunAddr,
      road: doc.roadAddr,
      enName: `${doc.engAddr}, ${doc.zipNo}, Korea`,
      postCode: doc.zipNo,
      // 좌표 검색시 필요 인자
      admCd: doc.admCd,       // 행정구역코드
      rnMgtSn: doc.rnMgtSn,   // 도로명코드
      udrtYn: doc.udrtYn,     // 지하여부
      buldMnnm: doc.buldMnnm, // 건물본번
      buldSlno: doc.buldSlno  // 건물부번
    }));

    res.json(createResponse(res, {
      total: +obj.common.totalCount,
      page: currentPage,
      limit: countPerPage,
      documents,
    }));

  } catch (e) {
    next(e);
  }
};


const getCoordinates = async (req, res, next) => {
  const convert = (x, y) => {
    //  todo: 위/경도 변환 코드 작성
    const firstProjection = '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs';
    const secondProjection = '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs';
    const [lng, lat] = proj4(firstProjection, secondProjection, [x, y]);
    return { lng, lat };
  };

  const { admCd, rnMgtSn, udrtYn, buldMnnm, buldSlno } = req.query;

  try {
    const response = await axios({
      method: 'post',
      url: COORDS_API_URL,
      data: { confmKey: COORDINATES_API_KEY, admCd, rnMgtSn, udrtYn, buldMnnm, buldSlno, resultType: 'json' },
      transformRequest: [data => qs.stringify(data)],
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const obj = JSON.parse(response.data.replace(/^\(/, '').replace(/\)$/, '')).results;
    if ((obj.juso || []).length === 0) return next(COORDINATES_NOT_FOUND);
    const { entX, entY } = obj.juso[0];
    const { lng, lat } = convert(+entX, +entY);
    res.json(createResponse(res, { lng, lat }));
  } catch (e) {
    next(e);
  }
};

exports.getAddresses = getAddresses;
exports.getCoordinates = getCoordinates;
