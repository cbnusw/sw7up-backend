const MAJORS = [
  '소프트웨어학과', '소프트웨어학부', '컴퓨터공학과', '정보통신공학부', '지능로봇공학과'
];

exports.convertDepartmentFilter = (filter, value, filterKey = 'department') => {
  const departments = (value || '').split(',');
  if (departments.length === 0) return;
  
  if (departments.includes('기타')) {
    const $nin = MAJORS.filter(major => !departments.includes(major));
    if ($nin.length > 0) filter[filterKey] = { $nin };
  } else {
    const $in = departments;
    filter[filterKey] = { $in };
  }
};
