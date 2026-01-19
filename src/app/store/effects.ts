import { HttpClient, HttpParams } from "@angular/common/http";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { Store } from "@ngrx/store";
import { AppState, Location, Pagenation } from "./reducer";
import * as ActiveActions from "./actions";
import { concatMap, map, switchMap, tap } from "rxjs/operators";
import { Category } from "../models/category.model";
import { Injectable } from "@angular/core";
import { Type } from "../models/type.model";
import { Activity } from "../models/activity.model";
import { Facility } from "../models/facility.model";
import { Address } from "../models/address.model";
import { Observable, of } from "rxjs";
import { isEmpty } from "lodash";
import { environment } from "../../environments/environment";

@Injectable({ providedIn: 'root' })
export class Effects {
    params: HttpParams = new HttpParams();
    BASE_PATH: string = environment.basePath;
    ACTIVITY_PATH: string = environment.activityPath;
    CATEGORY_PATH: string = environment.categoryPath;
    TYPE_PATH: string = environment.typePath;
    FACILITY_PATH: string = environment.facilityPath;
    constructor(
        private actions$: Actions,
        private http: HttpClient,
        private store: Store<AppState>,
        private helper: EffectsHelper
    ) {

        const sub = this.store.select('locationState').subscribe(location => {
            if (!isEmpty(location)) {
                this.params = this.params.set('lat', location.lat);
                this.params = this.params.set('lng', location.lng);

            } else {
                this.params = this.params.set('lat', '');
                this.params = this.params.set('lng', '');
            }


        })
    }

    getLocation = createEffect(() =>
        this.actions$.pipe(
            ofType(ActiveActions.getLocation),
            switchMap(() => {
                return new Observable<Location>(observer => {
                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((position) => {
                            if (position) {
                                const location = {
                                    lng: position.coords.longitude,
                                    lat: position.coords.latitude
                                }
                                observer.next(location);
                                observer.complete();
                            }
                        })
                    } else {
                        observer.next(null);
                    }
                }).pipe(
                    map(location => {
                        if (location) {
                            this.params = this.params.set('lat', location.lat);
                            this.params = this.params.set('lng', location.lng);
                        }
                        return ActiveActions.setLocation({ location });
                    })
                )

            })

        )
    )

    fetchAllCategories = createEffect(() =>
        this.actions$.pipe(
            ofType(ActiveActions.fetchAllCategories),
            tap(() => this.store.dispatch(ActiveActions.startFetching())),
            switchMap(() => {
                return this.helper.fetchResponse([this.BASE_PATH, this.CATEGORY_PATH]);
            }),
            map((json) => {
                return json['content'].map(category => {
                    return new Category(category['id'], category['title']);
                });
            }),
            map((categories) => {
                return ActiveActions.setCategories({ categories });
            })
        )
    );

    fetchPopularTypes = createEffect(() => {
        return this.actions$.pipe(
            ofType(ActiveActions.fetchPopularTypes),
            tap(() => this.store.dispatch(ActiveActions.startFetching())),
            switchMap(() => {
                const params = this.params.set('sort', 'popular');
                return this.helper.fetchResponse([this.BASE_PATH, this.TYPE_PATH], params);
            }),
            map((json) => {
                return json['content'].map(type => {
                    return this.helper.getType(type);
                });
            }),
            map((types) => {
                return ActiveActions.setPopularTypes({ types });
            })
        )
    })

    fetchTypesByCategory = createEffect(() => {
        let id: number;
        return this.actions$.pipe(
            ofType(ActiveActions.fetchTypesByCategory),
            tap(() => this.store.dispatch(ActiveActions.startFetching())),
            switchMap(({ categoryId }) => {
                id = categoryId;
                const params = this.params.set('size', 10000);
                return this.helper.fetchResponse([this.BASE_PATH, this.CATEGORY_PATH, '/', categoryId.toString(), this.TYPE_PATH], params);
            }),
            map((json) => {
                const types = json['content'].map(type => {
                    return this.helper.getType(type);
                })
                const pagenation = this.helper.getPagenation(json);
                return ActiveActions.setTypes({ categoryId: id, types, pagenation: pagenation });
            })
        )
    }
    );

    fetchActivitiesByType = createEffect(() => {
        let id: number;
        return this.actions$.pipe(
            ofType(ActiveActions.fetchActivitiesByType),
            tap(() => this.store.dispatch(ActiveActions.startFetching())),
            switchMap(({ typeId, page }) => {
                id = typeId;
                const params = this.params.set('size', 100000);
                return this.helper.fetchResponse([this.BASE_PATH, this.TYPE_PATH, '/', typeId.toString(), this.ACTIVITY_PATH], params);
            }),
            map((json) => {
                const pagenation = this.helper.getPagenation(json);
                const activities = json['content'].map((activity) => {
                    return this.helper.getActivity(activity);
                })
                return ActiveActions.setActivities({ typeId: id, activities, pagenation });
            })
        )
    })

    fetchActivitiesByPopularType = createEffect(() => {
        let id: number;
        let pagenation: Pagenation;
        return this.actions$.pipe(
            ofType(ActiveActions.fetchActivitiesByPopularType),
            tap(() => this.store.dispatch(ActiveActions.startFetching())),
            switchMap(({ typeId, page }) => {
                id = typeId;
                const params = this.params.set('size', 100000);
                return this.helper.fetchResponse([this.BASE_PATH, this.TYPE_PATH, '/', typeId.toString(), this.ACTIVITY_PATH], params);
            }),
            map((json) => {
                const pagenation = this.helper.getPagenation(json);
                const activities = json['content'].map((activity) => {
                    return this.helper.getActivity(activity);
                })
                return ActiveActions.setActivitiesForPopularType({ typeId: id, activities, pagenation });
            })
        )
    });

    fetchPopularTypes_ActivitiesForPopularType = createEffect(() => {
        let id: number;
        let pageNumber: number;
        return this.actions$.pipe(
            ofType(ActiveActions.fetchPopularTypes_ActivitiesForPopularType),
            tap(() => this.store.dispatch(ActiveActions.startFetching())),
            switchMap(({ typeId, page }) => {
                id = typeId;
                pageNumber = page;
                const params = this.params.set('sort', 'popular');
                return this.helper.fetchResponse([this.BASE_PATH, this.TYPE_PATH], params);
            }),
            map((json) => {
                return json['content'].map(type => {
                    return this.helper.getType(type);
                });
            }),
            tap((types) => {
                return ActiveActions.setPopularTypes({ types });
            }),
            switchMap(() => {
                const params = this.params.set('size', 100000);
                return this.helper.fetchResponse([this.BASE_PATH, this.TYPE_PATH, '/', id.toString(), this.ACTIVITY_PATH], params);
            }),
            map((json) => {
                const pagenation = this.helper.getPagenation(json);
                const activities = json['content'].map((activity) => {
                    return this.helper.getActivity(activity);
                })
                return ActiveActions.setActivitiesForPopularType({ typeId: id, activities, pagenation });
            })
        )
    })

    fetchActivtyById = createEffect(() => {
        return this.actions$.pipe(
            ofType(ActiveActions.fetchActivityById),
            tap(() => this.store.dispatch(ActiveActions.startFetching())),
            switchMap(({ id }) => {
                const params = this.params;
                return this.helper.fetchResponse([this.BASE_PATH, this.ACTIVITY_PATH, '/', id.toString()], params);
            }),
            map(activity => {
                return this.helper.getActivity(activity);
            }),
            map(activty => of(activty))
        );
    }, { dispatch: false });

    fetchAllFacilities = createEffect(() => {
        let sort: string;
        return this.actions$.pipe(
            ofType(ActiveActions.fetchAllFacilities),
            tap(() => this.store.dispatch(ActiveActions.startFetching())),
            concatMap(({ page, sortBy }) => {
                let params = this.params;
                sort = sortBy;
                params = params.set('page', page);
                params = params.set('size', 20);
                params = params.set('sort', sortBy);
                return this.helper.fetchResponse([this.BASE_PATH, this.FACILITY_PATH], params);
            }),
            map(json => {
                const pagenation = this.helper.getPagenation(json);
                const facilities = json['content'].map(facility => {
                    return this.helper.getFacility(facility);
                })
                return ActiveActions.setFacilities({ facilities, pagenation, sortBy: sort });
            })
        )
    });

    fetchFacilityById = createEffect(() => {
        return this.actions$.pipe(
            ofType(ActiveActions.fetchFacilityById),
            tap(() => this.store.dispatch(ActiveActions.startFetching())),
            concatMap(({ facilityId }) => {
                const params = this.params;
                return this.helper.fetchResponse([this.BASE_PATH, this.FACILITY_PATH, '/', facilityId.toString()], params);
            }),
            map((json) => {
                const facility = this.helper.getFacility(json);
                return ActiveActions.setFacility({ facility });
            })
        )
    })

    fetchFacilityAndTypesByFacility = createEffect(() => {
        let facilityId;
        return this.actions$.pipe(
            ofType(ActiveActions.fetchFacilityAndTypesByFacility),
            tap(() => this.store.dispatch(ActiveActions.startFetching())),
            switchMap(({ id }) => {
                facilityId = id;
                const params = this.params;
                return this.helper.fetchResponse([this.BASE_PATH, this.FACILITY_PATH, '/', id.toString()], params);
            }),
            map((json) => {
                const facility = this.helper.getFacility(json);
                return facility;
            }),
            tap((facility) => this.store.dispatch(ActiveActions.setFacilities({ facilities: [facility], pagenation: null, sortBy: 'title' }))),
            concatMap((facility) => {
                const params = this.params.set('size', 1000);
                return this.helper.fetchResponse([this.BASE_PATH, this.FACILITY_PATH, '/', facility.id.toString()], params);
            }),
            map((json) => {
                let types;
                if (json['content']) {
                    types = json['content'].map(type => {
                        return this.helper.getType(type);
                    });
                } else {
                    types = [];
                }

                return ActiveActions.setTypesInFacility({ facilityId, types });
            })
        )
    });

    fetchTypesByFacility = createEffect(() => {
        let id: number;
        return this.actions$.pipe(
            ofType(ActiveActions.fetchTypesByFacility),
            tap(() => this.store.dispatch(ActiveActions.startFetching())),
            switchMap(({ facilityId }) => {
                id = facilityId;
                const params = this.params.set('size', 10000);
                return this.helper.fetchResponse([this.BASE_PATH, this.FACILITY_PATH, '/', facilityId.toString(), this.TYPE_PATH], params);
            }),
            map((json) => {
                const types = json['content'].map(type => {
                    return this.helper.getType(type);
                });
                return ActiveActions.setTypesInFacility({ facilityId: id, types });
            })
        )
    })

    fetchAllFacilitiesAndTypesByFacility = createEffect(() => {
        let id: number;
        let pagenation: Pagenation;
        return this.actions$.pipe(
            ofType(ActiveActions.fetchAllFacilitiesAndTypesByFacility),
            tap(() => this.store.dispatch(ActiveActions.startFetching())),
            concatMap(({ facilityId }) => {
                id = facilityId;
                const params = this.params.set('size', 20);
                return this.helper.fetchResponse([this.BASE_PATH, this.FACILITY_PATH], params);
            }),
            map(json => {
                pagenation = this.helper.getPagenation(json);
                return json['content'].map(facility => {
                    return this.helper.getFacility(facility);
                })
            }),
            tap((facilities) => {
                return this.store.dispatch(ActiveActions.setFacilities({ facilities, pagenation, sortBy: 'title' }));
            }),
            concatMap(() => {
                const params = this.params.set('size', 10000);
                return this.helper.fetchResponse([this.BASE_PATH, this.FACILITY_PATH, '/', id.toString(), this.TYPE_PATH], params);
            }),
            map((json) => {
                const types = json['content'].map(type => {
                    return this.helper.getType(type);
                });
                return ActiveActions.setTypesInFacility({ facilityId: id, types });
            })
        )

    })

    fetchActivitiesByFacilityAndType = createEffect(() => {
        let facility: number;
        let type: number;
        let category: string;
        return this.actions$.pipe(
            ofType(ActiveActions.fetchActivitiesByFacilityAndType),
            tap(() => this.store.dispatch(ActiveActions.startFetching())),
            switchMap(({ facilityId, categoryName, typeId, page }) => {
                facility = facilityId;
                type = typeId;
                category = categoryName;
                let params = this.params;
                params = params.set('page', page);
                return this.helper.fetchResponse([this.BASE_PATH, this.FACILITY_PATH, '/', facilityId.toString(), this.TYPE_PATH, '/', typeId.toString(), this.ACTIVITY_PATH], params);
            }),
            map((json) => {
                const pagenation = this.helper.getPagenation(json);
                const activities = json['content'].map((activity) => {
                    return this.helper.getActivity(activity);
                });
                return ActiveActions.setActivitiesInFacilityWithType({ facilityId: facility, categoryName: category, typeId: type, activities: activities, pagenation: pagenation });
            })
        )
    })

    fetchAllFacilities_TypesAndActivitiesByFacility = createEffect(() => {
        let fId: number;
        let category: string;
        let tId: number;
        let pagenation: Pagenation;
        return this.actions$.pipe(
            ofType(ActiveActions.fetchAllFacilities_TypesAndActivitiesByFacility),
            tap(() => this.store.dispatch(ActiveActions.startFetching())),
            switchMap(({ facilityId, categoryName, typeId }) => {
                fId = facilityId;
                category = categoryName;
                tId = typeId;
                const params = this.params;
                return this.helper.fetchResponse([this.BASE_PATH, this.FACILITY_PATH], params);
            }),
            map(json => {
                pagenation = this.helper.getPagenation(json);
                return json['content'].map(facility => {
                    return this.helper.getFacility(facility);
                })
            }),
            tap((facilities) => this.store.dispatch(ActiveActions.setFacilities({ facilities, pagenation, sortBy: 'title' }))),
            concatMap(() => {
                const params = this.params.set('size', 10000);
                return this.helper.fetchResponse([this.BASE_PATH, this.FACILITY_PATH, '/', fId.toString(), this.TYPE_PATH], params);
            }),
            map((json) => {
                pagenation = this.helper.getPagenation(json);
                return json['content'].map(type => {
                    return this.helper.getType(type);
                });
            }),
            tap((types) => this.store.dispatch(ActiveActions.setTypesInFacility({ facilityId: fId, types }))),
            concatMap(() => {
                const params = this.params;
                return this.helper.fetchResponse([this.BASE_PATH, this.FACILITY_PATH, '/', fId.toString(), this.TYPE_PATH, '/', tId.toString(), this.ACTIVITY_PATH], params);
            }),
            map((json) => {
                pagenation = this.helper.getPagenation(json);
                return json['content'].map((activity) => {
                    return this.helper.getActivity(activity);
                })
            }),
            tap((activities) => this.store.dispatch(ActiveActions.setActivitiesInFacilityWithType({ facilityId: fId, categoryName: category, typeId: tId, activities: activities, pagenation }))
            )
        );
    }, { dispatch: false });
}

@Injectable({
    providedIn: 'root'
})
export class EffectsHelper {
    constructor(private http: HttpClient) { }
    getPagenation(json: Object): Pagenation {
        const pagenation: Pagenation = {
            first: json['first'],
            last: json['last'],
            number: json['number'],
        }

        return pagenation;
    }

    getType(type: Object): Type {
        return new Type(type['id'], type['title'], type['category']);
    }

    getActivity(activity: Object): Activity {
        let facilityJson = activity['facility'];
        let facility: Facility = this.getFacility(facilityJson);
        return new Activity(activity['id'], activity['title'], activity['category'], activity['reservationURL'], activity['isAvailable'], new Date(activity['startTime']), new Date(activity['endTime']), activity['minAge'], activity['maxAge'], new Date(activity['lastUpdated']), facility);
    }

    getFacility(facility: Object): Facility {
        let addressJson = facility['address'];
        let address: Address = this.getAddress(addressJson);
        return new Facility(facility['id'], facility['title'], facility['phone'], facility['email'], facility['url'], address, facility['longitude'], facility['latitude'], facility['distance']);
    }

    getAddress(address: Object): Address {
        return new Address(address['id'], address['street'], address['city'], address['province'], address['postalCode'], address['country']);
    }

    fetchResponse(arr: string[], params: HttpParams = null): Observable<Object> {
        let url: string = '';
        arr.forEach(i => {
            url = url.concat(i);
        })
        return this.http.get<Object>(url, { params: params });
    }

}