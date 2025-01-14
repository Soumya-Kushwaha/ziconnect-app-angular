import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { AngularMaterialModule } from 'src/app/material.module';
import { AdministrativeLevel, City, LocalityMapAutocomplete, LocalityStatistics, Region, State } from 'src/app/_models';
import { of, throwError } from 'rxjs';

import * as Leaflet from 'leaflet';

import { InteractiveOsmMapComponent } from './interactive-osm-map.component';
import { municipalityLayers, regionLayers, stateLayers } from 'src/test/locality-map-layers';
import { ShortNumberPipe } from 'src/app/_pipes';
import { regionStats } from 'src/test/item-stats-mock';
import { geoJsonCities, geoJsonRegions, geoJsonStates } from 'src/test/geo-json-mock';
import { ILocalityLayer, IMapLocalityLayer } from 'src/app/_interfaces';
import { localitiesMapAutocompleteResponseFromServer } from 'src/test/locality-map-autocomplete-mock';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { localityStatisticsMunicipalities, localityStatisticsRegions, localityStatisticsStates } from 'src/test/locality-statistics-mock';
import { citiesLocalityMapList, regionsLocalityMapList, statesLocalityMapList } from 'src/test/locality-map-mock';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

describe('InteractiveOsmMapComponent', () => {
  let component: InteractiveOsmMapComponent;
  let fixture: ComponentFixture<InteractiveOsmMapComponent>;

  const mockRegion = new Region('code01', 'Name01');
  const mockState = new State('code01', 'Name01', mockRegion);

  let mockCitiesLocalityMap = [] as any;
  let mockRegionsLocalityMap = [] as any;
  let mockStatesLocalityMap = [] as any;
  let mockMunicipalityLayers = municipalityLayers;
  let mockStateLayers = stateLayers;
  let mockGeoJsonCities = {} as any;
  let mockGeoJsonRegions = {} as any;
  let mockGeoJsonStates = {} as any;
  let mockRegionLayers = <IMapLocalityLayer>{};
  let mockRegionLayer = <ILocalityLayer>{};
  let mockRegionStats: LocalityStatistics;

  const mockLayerDefaultStyles = {
    weight: 0.5,
    color: '#fff',
    fillColor: '#000',
    fillOpacity: 0.75,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InteractiveOsmMapComponent, ShortNumberPipe],
      imports: [
        AngularMaterialModule,
        BrowserAnimationsModule,
        BrowserModule,
        CommonModule,
        FormsModule,
        HttpClientTestingModule,
        LeafletModule,
        NgxChartsModule,
        ReactiveFormsModule
      ]
    }).compileComponents();

    // Clone object
    mockCitiesLocalityMap = JSON.parse(JSON.stringify(citiesLocalityMapList));
    mockRegionsLocalityMap = JSON.parse(JSON.stringify(regionsLocalityMapList));
    mockStatesLocalityMap = JSON.parse(JSON.stringify(statesLocalityMapList));
    mockGeoJsonCities = JSON.parse(JSON.stringify(geoJsonCities));
    mockGeoJsonRegions = JSON.parse(JSON.stringify(geoJsonRegions));
    mockGeoJsonStates = JSON.parse(JSON.stringify(geoJsonStates));
    mockRegionStats = JSON.parse(JSON.stringify(regionStats));

    // Clone Layers
    mockRegionLayers = Object.assign({}, regionLayers);
    mockRegionLayer = Object.create(mockStateLayers[Object.keys(stateLayers)[0]]);

    fixture = TestBed.createComponent(InteractiveOsmMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('#ngOnInit', () => {

    it('should exists', () => {
      expect(component.ngOnInit).toBeTruthy();
      expect(component.ngOnInit).toEqual(jasmine.any(Function));
    });

    it('should works', async () => {
      spyOn(component, 'initMapViewOptions');
      spyOn(component, 'watchLoadingMap');
      spyOn(component, 'loadLocalityStatistics');
      spyOn(component, 'initRegionSelectOptions');
      spyOn(component, 'initStateSelectOptions');
      spyOn(component, 'initSearchLocationFilteredOptions');

      await component.ngOnInit();

      expect(component.initMapViewOptions).toHaveBeenCalled();
      expect(component.watchLoadingMap).toHaveBeenCalled();
      expect(component.loadLocalityStatistics).toHaveBeenCalled();
      expect(component.initRegionSelectOptions).toHaveBeenCalled();
      expect(component.initStateSelectOptions).toHaveBeenCalled();
      expect(component.initSearchLocationFilteredOptions).toHaveBeenCalled();
    });
  });

  //#region FILTER FUNCTIONS
  ////////////////////////////////////////////
  describe('#initRegionSelectOptions', () => {

    it('should exists', () => {
      expect(component.initRegionSelectOptions).toBeTruthy();
      expect(component.initRegionSelectOptions).toEqual(jasmine.any(Function));
    });

    it('should works when service throw error', async () => {
      //@ts-ignore
      spyOn(component.alertService, 'showError');

      //@ts-ignore
      spyOn(component.localityMapService, 'getRegionsOfCountry').and.throwError('Error message');
      await component.initRegionSelectOptions().catch((error) => {
        expect(error.toString()).toEqual('Error: Error message');
      });

      //@ts-ignore
      expect(component.alertService.showError).toHaveBeenCalled();
    });

    it('should works when service return error', async () => {
      //@ts-ignore
      spyOn(component.alertService, 'showError');

      //@ts-ignore
      spyOn(component.localityMapService, 'getRegionsOfCountry').and.returnValue(throwError({ message: 'http error' }));
      await component.initRegionSelectOptions().catch((error) => {
        expect(error).toBeTruthy();
        expect(error.message).toEqual('http error');
      });

      //@ts-ignore
      expect(component.alertService.showError).toHaveBeenCalledWith('Something went wrong retrieving region options: http error');
    });

    it('should works when service return success', async () => {
      const regionsResponse = [mockRegion];

      //@ts-ignore
      spyOn(component.localityMapService, 'getRegionsOfCountry').and.returnValue(of(regionsResponse));
      await component.initRegionSelectOptions();

      expect(component.mapFilter.regionOptions).toEqual(jasmine.any(Array));
      expect(component.mapFilter.regionOptions.length).toEqual(regionsResponse.length);
    });
  });

  describe('#initStateSelectOptions', () => {

    it('should exists', () => {
      expect(component.initStateSelectOptions).toBeTruthy();
      expect(component.initStateSelectOptions).toEqual(jasmine.any(Function));
    });

    it('should works when service throw error', async () => {
      //@ts-ignore
      spyOn(component.alertService, 'showError');

      //@ts-ignore
      spyOn(component.localityMapService, 'getStatesOfCountry').and.throwError('Error message');
      await component.initStateSelectOptions().catch((error) => {
        expect(error.toString()).toEqual('Error: Error message');
      });

      //@ts-ignore
      expect(component.alertService.showError).toHaveBeenCalled();
    });

    it('should works when service return error', async () => {
      //@ts-ignore
      spyOn(component.alertService, 'showError');

      //@ts-ignore
      spyOn(component.localityMapService, 'getStatesOfCountry').and.returnValue(throwError({ message: 'http error' }));
      await component.initStateSelectOptions().catch((error) => {
        expect(error).toBeTruthy();
        expect(error.message).toEqual('http error');
      });

      //@ts-ignore
      expect(component.alertService.showError).toHaveBeenCalledWith('Something went wrong retrieving state options: http error');
    });

    it('should works when service return success', async () => {
      const statesResponse = [mockState];

      //@ts-ignore
      spyOn(component.localityMapService, 'getStatesOfCountry').and.returnValue(of(statesResponse));
      await component.initStateSelectOptions();

      expect(component.mapFilter.stateOptions).toEqual(jasmine.any(Array));
      expect(component.mapFilter.stateOptions.length).toEqual(statesResponse.length);
    });
  });

  describe('#onChangeSelectedViewOption', () => {

    it('should exists', () => {
      expect(component.onChangeSelectedViewOption).toBeTruthy();
      expect(component.onChangeSelectedViewOption).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      spyOn(component, 'toggleFilterSettingsExpanded');
      spyOn(component, 'updateLayerFillColorByViewOption');

      component.mapMunicipalityLayers = mockMunicipalityLayers;
      component.mapRegionLayers = mockRegionLayers;
      component.mapStateLayers = mockStateLayers;

      const viewOption = component.mapFilter.viewOptions.find(x => x.value === 'Prediction');
      if (viewOption) {
        component.filterForm.controls['selectedViewOption'].setValue(viewOption);
        component.onChangeSelectedViewOption({} as any);

        expect(component.toggleFilterSettingsExpanded).toHaveBeenCalledWith(false);
        expect(component.updateLayerFillColorByViewOption).toHaveBeenCalled();
      }
    });
  });

  describe('#onCountryClick', () => {

    it('should exists', () => {
      expect(component.onCountryClick).toBeTruthy();
      expect(component.onCountryClick).toEqual(jasmine.any(Function));
    });

    it('should works', async () => {
      spyOn(component, 'loadLocalityStatistics');
      spyOn(component, 'loadRegionsGeoJson');
      spyOn(component, 'closeStatsPanel');
      spyOn(component.map, 'setView');

      await component.onCountryClick();

      expect(component.loadLocalityStatistics).toHaveBeenCalledWith(AdministrativeLevel.Region);
      expect(component.loadRegionsGeoJson).toHaveBeenCalled();
      expect(component.closeStatsPanel).toHaveBeenCalled();
      expect(component.map.setView).toHaveBeenCalledWith(component.mapOptions.center, component.mapOptions.zoom);
    });
  });

  describe('#onLegendItemMouseEnter', () => {

    it('should exists', () => {
      expect(component.onLegendItemMouseEnter).toBeTruthy();
      expect(component.onLegendItemMouseEnter).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      const rangeColorIndex = 0;

      spyOn(component, 'setLayerStateUnfocusedByColorIndex');

      component.onLegendItemMouseEnter(rangeColorIndex);

      expect(component.setLayerStateUnfocusedByColorIndex).toHaveBeenCalledWith(rangeColorIndex, component.mapRegionLayers);
      expect(component.setLayerStateUnfocusedByColorIndex).toHaveBeenCalledWith(rangeColorIndex, component.mapStateLayers);
      expect(component.setLayerStateUnfocusedByColorIndex).toHaveBeenCalledWith(rangeColorIndex, component.mapMunicipalityLayers);
    });
  });

  describe('#onLegendItemMouseLeave', () => {

    it('should exists', () => {
      expect(component.onLegendItemMouseLeave).toBeTruthy();
      expect(component.onLegendItemMouseLeave).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      spyOn(component, 'setLayerStateUnfocusedToNormalState');

      component.onLegendItemMouseLeave();

      expect(component.setLayerStateUnfocusedToNormalState).toHaveBeenCalledWith(component.mapRegionLayers);
      expect(component.setLayerStateUnfocusedToNormalState).toHaveBeenCalledWith(component.mapStateLayers);
      expect(component.setLayerStateUnfocusedToNormalState).toHaveBeenCalledWith(component.mapMunicipalityLayers);
    });
  });

  describe('#onSelectCity', () => {

    it('should exists', () => {
      expect(component.onSelectCity).toBeTruthy();
      expect(component.onSelectCity).toEqual(jasmine.any(Function));
    });

    it('should works', async () => {
      // Creating spy
      spyOn(component, 'openStatsPanel');
      spyOn(component, 'zoomToLayerBounds');

      // Initializing variables and setting properties values for test scenario
      const cityFromGeoJson = mockGeoJsonCities.features[0].properties;
      const region = new Region(cityFromGeoJson.region_code, cityFromGeoJson.region_name);
      const state = new State(cityFromGeoJson.state_code, cityFromGeoJson.state_name, region);
      const city = new City(cityFromGeoJson.municipality_code, cityFromGeoJson.municipality_name, state);

      component.mapMunicipalityLayers = mockMunicipalityLayers;
      component.mapStateLayers = mockStateLayers;

      // Execute test function
      await component.onSelectCity(city);

      // Test result expectations
      expect(component.mapFilter.selectedCity).toEqual(city);

      const municipalityLayer = component.mapMunicipalityLayers[city.code.toString()];
      if (municipalityLayer) {
        expect(component.zoomToLayerBounds).toHaveBeenCalledWith(municipalityLayer.layer.getBounds());
        expect(component.openStatsPanel).toHaveBeenCalledWith(municipalityLayer.feature);
      }
    });
  });

  describe('#onSelectRegion', () => {

    it('should exists', () => {
      expect(component.onSelectRegion).toBeTruthy();
      expect(component.onSelectRegion).toEqual(jasmine.any(Function));
    });

    it('should works', async () => {
      // Creating spy
      spyOn(component, 'loadLocalityStatistics');
      spyOn(component, 'loadStatesGeoJson');
      spyOn(component, 'openStatsPanel');
      spyOn(component, 'removeMunicipalityLayersFromMap');
      spyOn(component, 'removeStateLayersFromMap');
      spyOn(component, 'zoomToLayerBounds');

      // Initializing variables and setting properties values for test scenario
      const regionFromGeoJson = mockGeoJsonRegions.features[0].properties;
      const region = new Region(regionFromGeoJson.region_code, regionFromGeoJson.region_name);

      component.mapRegionLayers = mockRegionLayers

      // Execute test function
      await component.onSelectRegion(region);

      // Test result expectations
      expect(component.mapFilter.selectedCity).toEqual(undefined);
      expect(component.mapFilter.selectedRegion).toEqual(region);
      expect(component.mapFilter.selectedState).toEqual(undefined);

      expect(component.loadLocalityStatistics).toHaveBeenCalledWith(AdministrativeLevel.State);
      expect(component.loadStatesGeoJson).toHaveBeenCalledWith(component.mapFilter.selectedCountry, region.code.toString());
      expect(component.removeMunicipalityLayersFromMap).toHaveBeenCalledWith();
      expect(component.removeStateLayersFromMap).toHaveBeenCalledWith();

      const regionFeature = component.mapRegionLayers[region.code.toString()];
      if (regionFeature) {
        expect(component.openStatsPanel).toHaveBeenCalledWith(regionFeature.feature);
        expect(component.zoomToLayerBounds).toHaveBeenCalledWith(regionFeature.layer.getBounds());
      }
    });
  });

  describe('#onSelectState', () => {

    it('should exists', () => {
      expect(component.onSelectState).toBeTruthy();
      expect(component.onSelectState).toEqual(jasmine.any(Function));
    });

    it('should works', async () => {
      // Creating spy
      spyOn(component, 'loadLocalityStatistics');
      spyOn(component, 'loadCitiesGeoJson');
      spyOn(component, 'openStatsPanel');
      spyOn(component, 'removeMunicipalityLayersFromMap');
      spyOn(component, 'zoomToLayerBounds');

      // Initializing variables and setting properties values for test scenario
      const stateFromGeoJson = mockGeoJsonStates.features[0].properties;
      const region = new Region(stateFromGeoJson.region_code, stateFromGeoJson.region_name);
      const state = new State(stateFromGeoJson.state_code, stateFromGeoJson.state_name, region);

      component.mapRegionLayers = mockRegionLayers;
      component.mapStateLayers = mockStateLayers;

      // Execute test function
      await component.onSelectState(state);

      // Test result expectations
      expect(component.mapFilter.selectedCity).toEqual(undefined);
      expect(component.mapFilter.selectedRegion).toEqual(state.region);
      expect(component.mapFilter.selectedState).toEqual(state);

      expect(component.loadLocalityStatistics).toHaveBeenCalledWith(AdministrativeLevel.Municipality);
      expect(component.loadCitiesGeoJson).toHaveBeenCalledWith(component.mapFilter.selectedCountry ?? '', state.region.code.toString(), state.code.toString());
      expect(component.removeMunicipalityLayersFromMap).toHaveBeenCalledWith();

      const stateFeature = component.mapStateLayers[state.code.toString()];
      if (stateFeature) {
        expect(component.openStatsPanel).toHaveBeenCalledWith(stateFeature.feature);
        expect(component.zoomToLayerBounds).toHaveBeenCalledWith(stateFeature.layer.getBounds());
      }
    });
  });

  describe('#setLayerStateUnfocusedByColorIndex', () => {

    it('should exists', () => {
      expect(component.setLayerStateUnfocusedByColorIndex).toBeTruthy();
      expect(component.setLayerStateUnfocusedByColorIndex).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      spyOn(component, 'setMapDataStyles');

      const rangeColorIndex = 1;

      for (const [key, value] of Object.entries(mockRegionLayers)) {
        value.feature.properties.fillColorIndex = 0;
        value.feature.properties.filtered = true;
        value.feature.properties.state = 'normal';
      }

      component.setLayerStateUnfocusedByColorIndex(rangeColorIndex, mockRegionLayers);

      expect(component.setMapDataStyles).toHaveBeenCalled();

      for (const [key, value] of Object.entries(mockRegionLayers)) {
        expect(value.feature.properties.state).toEqual('unfocused');
      }
    });
  });

  describe('#setLayerStateUnfocusedToNormalState', () => {

    it('should exists', () => {
      expect(component.setLayerStateUnfocusedToNormalState).toBeTruthy();
      expect(component.setLayerStateUnfocusedToNormalState).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      spyOn(component, 'setMapDataStyles');

      for (const [key, value] of Object.entries(mockRegionLayers)) {
        value.feature.properties.filtered = true;
        value.feature.properties.state = 'unfocused';
      }

      component.setLayerStateUnfocusedToNormalState(mockRegionLayers);

      expect(component.setMapDataStyles).toHaveBeenCalled();

      for (const [key, value] of Object.entries(mockRegionLayers)) {
        expect(value.feature.properties.state).toEqual('normal');
      }
    });
  });

  //#endregion
  ////////////////////////////////////////////

  //#region MAP LOAD FUNCTIONS
  ////////////////////////////////////////////
  describe('#loadCitiesGeoJson', () => {

    it('should exists', () => {
      expect(component.loadCitiesGeoJson).toBeTruthy();
      expect(component.loadCitiesGeoJson).toEqual(jasmine.any(Function));
    });

    it('should works when service throw error', async () => {
      //@ts-ignore
      spyOn(component.alertService, 'showError');

      //@ts-ignore
      spyOn(component.localityMapService, 'getCitiesByState').and.throwError('Error message');
      await component.loadCitiesGeoJson('', '', '').catch((error) => {
        expect(error.toString()).toEqual('Error: Error message');
      });

      //@ts-ignore
      expect(component.alertService.showError).toHaveBeenCalled();
    });

    it('should works when service return error', async () => {
      //@ts-ignore
      spyOn(component.alertService, 'showError');

      //@ts-ignore
      spyOn(component.localityMapService, 'getCitiesByState').and.returnValue(throwError({ message: 'http error' }));
      await component.loadCitiesGeoJson('', '', '').catch((error) => {
        expect(error).toBeTruthy();
        expect(error.message).toEqual('http error');
      });

      //@ts-ignore
      expect(component.alertService.showError).toHaveBeenCalledWith('Something went wrong loading cities json: http error');
    });

    it('should works when service return success', async () => {
      spyOn(component.map, 'addLayer');
      spyOn(component, 'getFeaturePopup');
      spyOn(component, 'getLocalityStatisticsByMunicipalityCode').and.returnValue(localityStatisticsMunicipalities[0]);

      //@ts-ignore
      spyOn(component.localityMapService, 'getCitiesByState').and.returnValue(of(mockCitiesLocalityMap));
      await component.loadCitiesGeoJson('', '', '');

      expect(component.getLocalityStatisticsByMunicipalityCode).toHaveBeenCalled();
      expect(component.map.addLayer).toHaveBeenCalled();
      expect(component.getFeaturePopup).toHaveBeenCalled();
    });
  });

  describe('#loadLocalityStatistics', () => {

    it('should exists', () => {
      expect(component.loadLocalityStatistics).toBeTruthy();
      expect(component.loadLocalityStatistics).toEqual(jasmine.any(Function));
    });

    it('should works when service throw error', async () => {
      //@ts-ignore
      spyOn(component.alertService, 'showError');

      //@ts-ignore
      spyOn(component.localityStatisticsService, 'getStatisticsOfAdministrativeLevelLocalities').and.throwError('Error message');
      await component.loadLocalityStatistics(AdministrativeLevel.Region).catch((error) => {
        expect(error.toString()).toEqual('Error: Error message');
      });

      //@ts-ignore
      expect(component.alertService.showError).toHaveBeenCalled();
    });

    it('should works when service return error', async () => {
      //@ts-ignore
      spyOn(component.alertService, 'showError');

      //@ts-ignore
      spyOn(component.localityStatisticsService, 'getStatisticsOfAdministrativeLevelLocalities').and.returnValue(throwError({ message: 'http error' }));
      await component.loadLocalityStatistics(AdministrativeLevel.Region).catch((error) => {
        expect(error).toBeTruthy();
        expect(error.message).toEqual('http error');
      });

      //@ts-ignore
      expect(component.alertService.showError).toHaveBeenCalledWith('Something went wrong loading locality statistics: http error');
    });

    it('should works for regions', async () => {
      component.mapFilter.selectedCountry = 'BR';

      //@ts-ignore
      spyOn(component.localityStatisticsService, 'getStatisticsOfAdministrativeLevelLocalities').and.returnValue(of(localityStatisticsRegions));
      await component.loadLocalityStatistics(AdministrativeLevel.Region);

      //@ts-ignore
      expect(component.localityStatisticsService.getStatisticsOfAdministrativeLevelLocalities).toHaveBeenCalledWith(AdministrativeLevel.Region, 'BR', '', '');
      expect(component.localityStatistics.length).toEqual(localityStatisticsRegions.length);
    });

    it('should works for states', async () => {
      component.mapFilter.selectedCountry = 'BR';
      component.mapFilter.selectedRegion = mockRegion;

      //@ts-ignore
      spyOn(component.localityStatisticsService, 'getStatisticsOfAdministrativeLevelLocalities').and.returnValue(of(localityStatisticsStates));
      await component.loadLocalityStatistics(AdministrativeLevel.State);

      //@ts-ignore
      expect(component.localityStatisticsService.getStatisticsOfAdministrativeLevelLocalities).toHaveBeenCalledWith(AdministrativeLevel.State, 'BR', mockRegion.code, '');
      expect(component.localityStatistics.length).toEqual(localityStatisticsStates.length);
    });

    it('should works for municipalities', async () => {
      component.mapFilter.selectedCountry = 'BR';
      component.mapFilter.selectedRegion = mockRegion;
      component.mapFilter.selectedState = mockState;

      //@ts-ignore
      spyOn(component.localityStatisticsService, 'getStatisticsOfAdministrativeLevelLocalities').and.returnValue(of(localityStatisticsMunicipalities));
      await component.loadLocalityStatistics(AdministrativeLevel.Municipality);

      //@ts-ignore
      expect(component.localityStatisticsService.getStatisticsOfAdministrativeLevelLocalities).toHaveBeenCalledWith(AdministrativeLevel.Municipality, 'BR', mockRegion.code, mockState.code);
      expect(component.localityStatistics.length).toEqual(localityStatisticsMunicipalities.length);
    });
  });

  describe('#loadRegionsGeoJson', () => {

    it('should exists', () => {
      expect(component.loadRegionsGeoJson).toBeTruthy();
      expect(component.loadRegionsGeoJson).toEqual(jasmine.any(Function));
    });

    it('should works when service throw error', async () => {
      //@ts-ignore
      spyOn(component.alertService, 'showError');

      //@ts-ignore
      spyOn(component.localityMapService, 'getLocalityMapRegionsByCountry').and.throwError('Error message');
      await component.loadRegionsGeoJson().catch((error) => {
        expect(error.toString()).toEqual('Error: Error message');
      });

      //@ts-ignore
      expect(component.alertService.showError).toHaveBeenCalled();
    });

    it('should works when service return error', async () => {
      //@ts-ignore
      spyOn(component.alertService, 'showError');

      //@ts-ignore
      spyOn(component.localityMapService, 'getLocalityMapRegionsByCountry').and.returnValue(throwError({ message: 'http error' }));
      await component.loadRegionsGeoJson().catch((error) => {
        expect(error).toBeTruthy();
        expect(error.message).toEqual('http error');
      });

      //@ts-ignore
      expect(component.alertService.showError).toHaveBeenCalledWith('Something went wrong loading regions localities: http error');
    });

    it('should works when service return success', async () => {
      spyOn(component.map, 'addLayer');
      spyOn(component, 'getFeaturePopup');
      spyOn(component, 'getLocalityStatisticsByRegionCode').and.returnValue(localityStatisticsRegions[0]);

      //@ts-ignore
      spyOn(component.localityMapService, 'getLocalityMapRegionsByCountry').and.returnValue(of(mockRegionsLocalityMap));
      await component.loadRegionsGeoJson();

      expect(component.getLocalityStatisticsByRegionCode).toHaveBeenCalled();
      expect(component.map.addLayer).toHaveBeenCalled();
      expect(component.getFeaturePopup).toHaveBeenCalled();
    });
  });

  describe('#loadStatesGeoJson', () => {

    it('should exists', () => {
      expect(component.loadStatesGeoJson).toBeTruthy();
      expect(component.loadStatesGeoJson).toEqual(jasmine.any(Function));
    });

    it('should works when service throw error', async () => {
      //@ts-ignore
      spyOn(component.alertService, 'showError');

      //@ts-ignore
      spyOn(component.localityMapService, 'getStatesByRegion').and.throwError('Error message');
      await component.loadStatesGeoJson('', '').catch((error) => {
        expect(error.toString()).toEqual('Error: Error message');
      });

      //@ts-ignore
      expect(component.alertService.showError).toHaveBeenCalled();
    });

    it('should works when service return error', async () => {
      //@ts-ignore
      spyOn(component.alertService, 'showError');

      //@ts-ignore
      spyOn(component.localityMapService, 'getStatesByRegion').and.returnValue(throwError({ message: 'http error' }));
      await component.loadStatesGeoJson('', '').catch((error) => {
        expect(error).toBeTruthy();
        expect(error.message).toEqual('http error');
      });

      //@ts-ignore
      expect(component.alertService.showError).toHaveBeenCalledWith('Something went wrong loading states json: http error');
    });

    it('should works when service return success', async () => {
      spyOn(component.map, 'addLayer');
      spyOn(component, 'getFeaturePopup');
      spyOn(component, 'getLocalityStatisticsByStateCode').and.returnValue(localityStatisticsStates[0]);

      //@ts-ignore
      spyOn(component.localityMapService, 'getStatesByRegion').and.returnValue(of(mockStatesLocalityMap));
      await component.loadStatesGeoJson('', '');

      expect(component.getLocalityStatisticsByStateCode).toHaveBeenCalled();
      expect(component.map.addLayer).toHaveBeenCalled();
      expect(component.getFeaturePopup).toHaveBeenCalled();
    });
  });
  //#endregion
  ////////////////////////////////////////////

  //#region MAP MOUSE FUNCTIONS
  ////////////////////////////////////////////
  describe('#onMapMouseOverLayer', () => {

    it('should exists', () => {
      expect(component.onMapMouseOverLayer).toBeTruthy();
      expect(component.onMapMouseOverLayer).toEqual(jasmine.any(Function));
    });

    it('should works for unfocused state', () => {
      spyOn(component, 'setMapDataStyles').and.returnValue(mockLayerDefaultStyles);

      const event = {
        target: {
          feature: {
            properties: {
              state: 'unfocused'
            }
          },
          setStyle: jasmine.createSpy()
        }
      };

      component.onMapMouseOverLayer(event);

      expect(event.target.feature.properties.state).toEqual('unfocused-hover');
      expect(event.target.setStyle).toHaveBeenCalledWith(mockLayerDefaultStyles);
    });

    it('should works for not unfocused state', () => {
      spyOn(component, 'setMapDataStyles').and.returnValue(mockLayerDefaultStyles);

      const event = {
        target: {
          feature: {
            properties: {
              state: 'normal'
            }
          },
          setStyle: jasmine.createSpy()
        }
      };

      component.onMapMouseOverLayer(event);

      expect(event.target.feature.properties.state).toEqual('hover');
      expect(event.target.setStyle).toHaveBeenCalledWith(mockLayerDefaultStyles);
    });
  });

  describe('#onMapMouseOutLayer', () => {

    it('should exists', () => {
      expect(component.onMapMouseOutLayer).toBeTruthy();
      expect(component.onMapMouseOutLayer).toEqual(jasmine.any(Function));
    });

    it('should works for unfocused-hover state', () => {
      spyOn(component, 'setMapDataStyles').and.returnValue(mockLayerDefaultStyles);

      const event = {
        target: {
          feature: {
            properties: {
              state: 'unfocused-hover'
            }
          },
          setStyle: jasmine.createSpy()
        }
      };

      component.onMapMouseOutLayer(event);

      expect(event.target.feature.properties.state).toEqual('unfocused');
      expect(event.target.setStyle).toHaveBeenCalledWith(mockLayerDefaultStyles);
    });

    it('should works for unfocused state', () => {
      spyOn(component, 'setMapDataStyles').and.returnValue(mockLayerDefaultStyles);

      const event = {
        target: {
          feature: {
            properties: {
              state: 'unfocused'
            }
          },
          setStyle: jasmine.createSpy()
        }
      };

      component.onMapMouseOutLayer(event);

      expect(event.target.feature.properties.state).toEqual('unfocused');
      expect(event.target.setStyle).toHaveBeenCalledWith(mockLayerDefaultStyles);
    });

    it('should works for not unfocused or unfocused-hover state', () => {
      spyOn(component, 'setMapDataStyles').and.returnValue(mockLayerDefaultStyles);

      const event = {
        target: {
          feature: {
            properties: {
              state: 'hover'
            }
          },
          setStyle: jasmine.createSpy()
        }
      };

      component.onMapMouseOutLayer(event);

      expect(event.target.feature.properties.state).toEqual('normal');
      expect(event.target.setStyle).toHaveBeenCalledWith(mockLayerDefaultStyles);
    });
  });

  describe('#onMapRegionClick', () => {

    it('should exists', () => {
      expect(component.onMapRegionClick).toBeTruthy();
      expect(component.onMapRegionClick).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      spyOn(component, 'zoomToLayerBounds');
      spyOn(component, 'onSelectRegion');

      component.localityMapRegions = mockRegionsLocalityMap;

      const localityMapRegion = component.localityMapRegions[0];
      const bounds = Leaflet.latLngBounds([10, 10], [10, 10]);
      const event = {
        target: {
          feature: {
            properties: {
              code: localityMapRegion.regionCode
            }
          },
          getBounds: jasmine.createSpy().and.returnValue(bounds)
        }
      };

      component.onMapRegionClick(event);

      if (localityMapRegion.region) {
        expect(component.onSelectRegion).toHaveBeenCalledWith(localityMapRegion.region);
      }
      expect(component.zoomToLayerBounds).toHaveBeenCalledWith(bounds);
    });
  });

  describe('#onMapStateClick', () => {

    it('should exists', () => {
      expect(component.onMapStateClick).toBeTruthy();
      expect(component.onMapStateClick).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      spyOn(component, 'zoomToLayerBounds');
      spyOn(component, 'onSelectState');

      component.localityMapStates = mockStatesLocalityMap;

      const localityMapState = component.localityMapStates[0];
      const bounds = Leaflet.latLngBounds([10, 10], [10, 10]);
      const event = {
        target: {
          feature: {
            properties: {
              code: localityMapState.stateCode
            }
          },
          getBounds: jasmine.createSpy().and.returnValue(bounds)
        }
      };

      component.onMapStateClick(event);

      if (localityMapState.state) {
        expect(component.onSelectState).toHaveBeenCalledWith(localityMapState.state);
      }
      expect(component.zoomToLayerBounds).toHaveBeenCalledWith(bounds);
    });
  });

  describe('#onMapMunicipalityClick', () => {

    it('should exists', () => {
      expect(component.onMapMunicipalityClick).toBeTruthy();
      expect(component.onMapMunicipalityClick).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      spyOn(component, 'zoomToLayerBounds');
      spyOn(component, 'onSelectCity');

      component.localityMapMunicipalities = mockCitiesLocalityMap;

      const localityMapMunicipality = component.localityMapMunicipalities[0];
      const bounds = Leaflet.latLngBounds([10, 10], [10, 10]);
      const event = {
        target: {
          feature: {
            properties: {
              code: localityMapMunicipality.municipalityCode
            }
          },
          getBounds: jasmine.createSpy().and.returnValue(bounds)
        }
      };

      component.onMapMunicipalityClick(event);

      if (localityMapMunicipality.municipality) {
        expect(component.onSelectCity).toHaveBeenCalledWith(localityMapMunicipality.municipality);
      }
      expect(component.zoomToLayerBounds).toHaveBeenCalledWith(bounds);
    });
  });
  //#endregion
  ////////////////////////////////////////////

  //#region MAP STATS PANEL
  ////////////////////////////////////////////

  describe('#closeStatsPanel', () => {

    it('should exists', () => {
      expect(component.closeStatsPanel).toBeTruthy();
      expect(component.closeStatsPanel).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      component.mapStatsPanel.item = {};
      component.mapStatsPanel.open = true;

      component.closeStatsPanel();

      expect(component.mapStatsPanel.item).toEqual(null);
      expect(component.mapStatsPanel.open).toEqual(false);
    });
  });

  describe('#getInternetAvailabilityPredictionUnitStr', () => {

    it('should exists', () => {
      expect(component.getInternetAvailabilityPredictionUnitStr).toBeTruthy();
      expect(component.getInternetAvailabilityPredictionUnitStr).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      const predictionCount = 1500;
      const schoolsWithoutConnectivityDataCount = 3000;

      const predictionCountStr = new ShortNumberPipe().transform(predictionCount);
      const withoutDataCountStr = new ShortNumberPipe().transform(schoolsWithoutConnectivityDataCount);

      const result = component.getInternetAvailabilityPredictionUnitStr(predictionCount, schoolsWithoutConnectivityDataCount);

      expect(result).toEqual(`${predictionCountStr}/${withoutDataCountStr} schools`);
    });
  });

  describe('#getKeyValuePairToChartData', () => {

    it('should exists', () => {
      expect(component.getKeyValuePairToChartData).toBeTruthy();
      expect(component.getKeyValuePairToChartData).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      const param = {
        'prop01': 'value01',
        'prop02': 'value02'
      };
      const expectedResult = [{
        name: 'prop01',
        value: 'value01'
      }, {
        name: 'prop02',
        value: 'value02'
      }];

      const result = component.getKeyValuePairToChartData(param);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('#getKeyValuePairToGroupedChartData', () => {

    it('should exists', () => {
      expect(component.getKeyValuePairToGroupedChartData).toBeTruthy();
      expect(component.getKeyValuePairToGroupedChartData).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      const param = {
        'group01': {
          'item01': 'value01',
          'item02': 'value02'
        }
      };

      const expectedResult = [{
        name: 'group01',
        series: [{
          name: 'item01',
          value: 'value01'
        }, {
          name: 'item02',
          value: 'value02'
        }]
      }];

      const result = component.getKeyValuePairToGroupedChartData(param);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('#numberCardFormatPercentage', () => {

    it('should exists', () => {
      expect(component.numberCardFormatPercentage).toBeTruthy();
      expect(component.numberCardFormatPercentage).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      let result;

      result = component.numberCardFormatPercentage(75);
      expect(result).toEqual('75%');

      result = component.numberCardFormatPercentage({ value: 75 });
      expect(result).toEqual('75%');
    });
  });

  describe('#numberCardFormatShortNumber', () => {

    it('should exists', () => {
      expect(component.numberCardFormatShortNumber).toBeTruthy();
      expect(component.numberCardFormatShortNumber).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      const result = component.numberCardFormatShortNumber({ value: 1500 });
      expect(result).toEqual(new ShortNumberPipe().transform(1500));
    });
  });

  describe('#openStatsPanel', () => {

    it('should exists', () => {
      expect(component.openStatsPanel).toBeTruthy();
      expect(component.openStatsPanel).toEqual(jasmine.any(Function));
    });

    it('should works without item stats', () => {
      const dataFeature = mockRegionLayer.feature;
      if (dataFeature) {
        dataFeature.properties.stats = null;

        //@ts-ignore
        spyOn(component.alertService, 'showError');

        component.openStatsPanel(dataFeature);

        //@ts-ignore
        expect(component.alertService.showError).toHaveBeenCalledWith('Item statistics was not provided!');
      }
    });

    it('should works', () => {
      const dataFeature = mockRegionLayer.feature;
      if (dataFeature) {
        dataFeature.properties.stats = mockRegionStats;

        component.openStatsPanel(dataFeature);

        expect(component.mapStatsPanel.internetAvailabityPrediction).toEqual(mockRegionStats.schoolInternetAvailabilityPredicitionPercentage);
        expect(component.mapStatsPanel.internetAvailabityPredictionUnits).toEqual(component.getInternetAvailabilityPredictionUnitStr(regionStats.schoolInternetAvailabilityPredicitionCount, regionStats.schoolWithoutInternetAvailabilityCount));
        expect(component.mapStatsPanel.connectivityBySchoolRegion).toEqual(component.getKeyValuePairToGroupedChartData(regionStats.internetAvailabilityBySchoolRegion));
        expect(component.mapStatsPanel.connectivityBySchoolType).toEqual(component.getKeyValuePairToGroupedChartData(regionStats.internetAvailabilityBySchoolType));
        expect(component.mapStatsPanel.open).toBeTrue();
      }
    });
  });

  describe('#toggleStatsPanel', () => {

    it('should exists', () => {
      expect(component.toggleStatsPanel).toBeTruthy();
      expect(component.toggleStatsPanel).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      const statsPanelOpen = component.mapStatsPanel.open;

      component.toggleStatsPanel();

      expect(component.mapStatsPanel.open).toEqual(!statsPanelOpen);
    });
  });

  //#endregion
  ////////////////////////////////////////////

  //#region MAP UTIL FUNCTIONS
  ////////////////////////////////////////////
  describe('#getFeaturePopup', () => {

    it('should exists', () => {
      expect(component.getFeaturePopup).toBeTruthy();
      expect(component.getFeaturePopup).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      //@ts-ignore
      spyOn(component.localityLayerService, 'compilePopup');

      const regionLayer = mockRegionLayer;

      component.getFeaturePopup(regionLayer.feature);

      //@ts-ignore
      expect(component.localityLayerService.compilePopup).toHaveBeenCalledWith(<IMapInfoWindowContent>{
        name: regionLayer.feature.properties.name,
        code: regionLayer.feature.properties.code,
        stats: regionLayer.feature.properties.stats,
        type: regionLayer.feature.properties.adm_level
      });
    });
  });

  describe('#removeAllLocalityLayersFromMap', () => {

    it('should exists', () => {
      expect(component.removeAllLocalityLayersFromMap).toBeTruthy();
      expect(component.removeAllLocalityLayersFromMap).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      spyOn(component, 'removeMunicipalityLayersFromMap');
      spyOn(component, 'removeRegionLayersFromMap');
      spyOn(component, 'removeStateLayersFromMap');

      component.removeAllLocalityLayersFromMap();

      expect(component.removeMunicipalityLayersFromMap).toHaveBeenCalledWith();
      expect(component.removeRegionLayersFromMap).toHaveBeenCalledWith();
      expect(component.removeStateLayersFromMap).toHaveBeenCalledWith();
    });
  });

  describe('#removeRegionLayersFromMap', () => {

    it('should exists', () => {
      expect(component.removeRegionLayersFromMap).toBeTruthy();
      expect(component.removeRegionLayersFromMap).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      component.mapRegionLayers = mockRegionLayers;

      component.removeRegionLayersFromMap();

      expect(component.mapRegionLayers).toEqual(<IMapLocalityLayer>{});
    });
  });

  describe('#removeStateLayersFromMap', () => {

    it('should exists', () => {
      expect(component.removeStateLayersFromMap).toBeTruthy();
      expect(component.removeStateLayersFromMap).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      component.mapStateLayers = mockStateLayers;

      component.removeStateLayersFromMap();

      expect(component.mapStateLayers).toEqual(<IMapLocalityLayer>{});
    });
  });

  describe('#removeMunicipalityLayersFromMap', () => {

    it('should exists', () => {
      expect(component.removeMunicipalityLayersFromMap).toBeTruthy();
      expect(component.removeMunicipalityLayersFromMap).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      component.mapMunicipalityLayers = mockMunicipalityLayers;

      component.removeMunicipalityLayersFromMap();

      expect(component.mapMunicipalityLayers).toEqual(<IMapLocalityLayer>{});
    });
  });

  describe('#setMapDataStyles', () => {

    it('should exists', () => {
      expect(component.setMapDataStyles).toBeTruthy();
      expect(component.setMapDataStyles).toEqual(jasmine.any(Function));
    });

    it('should works feature without stats', () => {
      spyOn(component.map, 'fitBounds');

      mockRegionLayer.feature.properties.state = 'normal';
      mockRegionLayer.feature.properties.stats = null;

      const result = component.setMapDataStyles(mockRegionLayer.feature);

      expect(result).toEqual({
        weight: 0.5,
        color: '#fff',
        fillColor: '#000',
        fillOpacity: 0.75,
      });
    });

    it('should works feature with stats', () => {
      spyOn(component.map, 'fitBounds');

      mockRegionLayer.feature.properties.state = 'normal';
      mockRegionLayer.feature.properties.stats = mockRegionStats;
      mockRegionLayer.feature.properties.fillColor = '#56d132';

      const result = component.setMapDataStyles(mockRegionLayer.feature);

      expect(result).toEqual({
        weight: 0.5,
        color: '#fff',
        fillColor: '#56d132',
        fillOpacity: 0.75,
      });
    });

    it('should works for hover state', () => {
      spyOn(component.map, 'fitBounds');

      mockRegionLayer.feature.properties.state = 'hover';
      mockRegionLayer.feature.properties.stats = null;

      const result = component.setMapDataStyles(mockRegionLayer.feature);

      expect(result).toEqual({
        weight: 2,
        color: '#fff',
        fillColor: '#000',
        fillOpacity: 0.75,
      });
    });

    it('should works for unfocused state', () => {
      spyOn(component.map, 'fitBounds');

      mockRegionLayer.feature.properties.state = 'unfocused';
      mockRegionLayer.feature.properties.stats = null;

      const result = component.setMapDataStyles(mockRegionLayer.feature);

      expect(result).toEqual({
        weight: 0.5,
        color: '#fff',
        fillColor: '#dedede',
        fillOpacity: 0.75,
      });
    });

    it('should works for unfocused-hover state', () => {
      spyOn(component.map, 'fitBounds');

      mockRegionLayer.feature.properties.state = 'unfocused-hover';
      mockRegionLayer.feature.properties.stats = null;

      const result = component.setMapDataStyles(mockRegionLayer.feature);

      expect(result).toEqual({
        weight: 2,
        color: '#D9A981',
        fillColor: '#F7CCA9',
        fillOpacity: 0.75,
      });
    });
  });

  describe('#setMapElementFillColor', () => {

    it('should exists', () => {
      expect(component.setMapElementFillColor).toBeTruthy();
      expect(component.setMapElementFillColor).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      let element = {
        properties: {
          stats: <LocalityStatistics>{
            schoolInternetAvailabilityPercentage: 70,
            schoolInternetAvailabilityPredicitionPercentage: 50
          },
          fillColor: '',
          fillColorIndex: 0
        }
      };

      const viewOption = component.mapFilter.viewOptions.find(x => x.value === 'Connectivity');
      if (viewOption) {
        component.filterForm.controls['selectedViewOption'].setValue(viewOption);
      }

      const percentage = component.getPercentageValueForFillColor(element.properties.stats);
      const indexAtPercentage = component.getRangeColorIndex(percentage);

      component.setMapElementFillColor(element);

      expect(element.properties.fillColor).toEqual(component.getSelectedViewOption.rangeColors[indexAtPercentage].backgroundColor);
      expect(element.properties.fillColorIndex).toEqual(indexAtPercentage);
    });
  });

  describe('#zoomToLayerBounds', () => {

    it('should exists', () => {
      expect(component.zoomToLayerBounds).toBeTruthy();
      expect(component.zoomToLayerBounds).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      spyOn(component.map, 'fitBounds');

      const bounds = Leaflet.latLngBounds([10, 10], [10, 10]);

      component.zoomToLayerBounds(bounds);

      expect(component.map.fitBounds).toHaveBeenCalledWith(bounds);
    });
  });

  //#endregion
  ////////////////////////////////////////////

  //#region MAT-SELECT FUNCTIONS
  ////////////////////////////////////////////
  describe('#matSelectCompareCodes', () => {

    it('should exists', () => {
      expect(component.matSelectCompareCodes).toBeTruthy();
      expect(component.matSelectCompareCodes).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      let result = component.matSelectCompareCodes({}, {});
      expect(result).toEqual(true);

      result = component.matSelectCompareCodes({ code: '1' }, { code: '1' });
      expect(result).toEqual(true);

      result = component.matSelectCompareCodes({ code: '1' }, { code: '2' });
      expect(result).toEqual(false);
    });
  });

  describe('#onRegionSelectionChange', () => {

    it('should exists', () => {
      expect(component.onRegionSelectionChange).toBeTruthy();
      expect(component.onRegionSelectionChange).toEqual(jasmine.any(Function));
    });

    it('should works with selected region', () => {
      spyOn(component, 'onSelectRegion');
      spyOn(component, 'toggleFilterSettingsExpanded');

      const region = new Region('1', 'Region 1');
      component.mapFilter.selectedRegion = region;

      component.onRegionSelectionChange();

      expect(component.onSelectRegion).toHaveBeenCalledWith(component.mapFilter.selectedRegion);
      expect(component.toggleFilterSettingsExpanded).toHaveBeenCalledWith(false);
    });

    it('should works without selected region', () => {
      spyOn(component, 'loadRegionsGeoJson');
      spyOn(component, 'removeAllLocalityLayersFromMap');
      spyOn(component, 'toggleFilterSettingsExpanded');

      component.mapFilter.selectedRegion = undefined;

      component.onRegionSelectionChange();

      expect(component.loadRegionsGeoJson).toHaveBeenCalledWith();
      expect(component.removeAllLocalityLayersFromMap).toHaveBeenCalledWith();
      expect(component.toggleFilterSettingsExpanded).toHaveBeenCalledWith(false);
    });
  });

  describe('#onStateSelectionChange', () => {

    it('should exists', () => {
      expect(component.onStateSelectionChange).toBeTruthy();
      expect(component.onStateSelectionChange).toEqual(jasmine.any(Function));
    });

    it('should works with selected state', async () => {
      spyOn(component, 'onSelectRegion');
      spyOn(component, 'onSelectState');
      spyOn(component, 'toggleFilterSettingsExpanded');

      const region = new Region('1', 'Region 1');
      const state = new State('1', 'State 1', region);
      component.mapFilter.selectedState = state;

      await component.onStateSelectionChange();

      expect(component.onSelectRegion).toHaveBeenCalledWith(component.mapFilter.selectedState.region);
      expect(component.onSelectState).toHaveBeenCalledWith(component.mapFilter.selectedState);
      expect(component.toggleFilterSettingsExpanded).toHaveBeenCalledWith(false);
    });

    it('should works without selected state', async () => {
      spyOn(component, 'loadRegionsGeoJson');
      spyOn(component, 'removeAllLocalityLayersFromMap');
      spyOn(component, 'toggleFilterSettingsExpanded');

      component.mapFilter.selectedState = undefined;

      await component.onStateSelectionChange();

      expect(component.loadRegionsGeoJson).toHaveBeenCalledWith();
      expect(component.removeAllLocalityLayersFromMap).toHaveBeenCalledWith();
      expect(component.toggleFilterSettingsExpanded).toHaveBeenCalledWith(false);
    });
  });

  describe('#updateLayerFillColorByViewOption', () => {

    it('should exists', () => {
      expect(component.updateLayerFillColorByViewOption).toBeTruthy();
      expect(component.updateLayerFillColorByViewOption).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      spyOn(component, 'getRangeColorIndex').and.returnValue(0);
      spyOn(component, 'setMapDataStyles');
      spyOn(mockRegionLayer.layer, 'setStyle');

      mockRegionLayer.feature.properties.stats = mockRegionStats;

      component.updateLayerFillColorByViewOption(mockRegionLayer.feature, mockRegionLayer.layer);

      expect(mockRegionLayer.feature.properties.fillColor).toEqual(component.getSelectedViewOption.rangeColors[0].backgroundColor);
      expect(mockRegionLayer.feature.properties.fillColorIndex).toEqual(0);
      expect(mockRegionLayer.layer.setStyle).toHaveBeenCalled();
      expect(component.setMapDataStyles).toHaveBeenCalledWith(mockRegionLayer.feature);
    });
  });
  //#endregion
  ////////////////////////////////////////////

  //#region SEARCH LOCATION AUTOCOMPLETE
  ////////////////////////////////////////////
  describe('#getSearchLocationAutocompleteText', () => {

    it('should exists', () => {
      expect(component.getSearchLocationAutocompleteText).toBeTruthy();
      expect(component.getSearchLocationAutocompleteText).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      let result;
      let locationAutocomplete = <LocalityMapAutocomplete>{
        name: 'Name01'
      };

      result = component.getSearchLocationAutocompleteText(locationAutocomplete);
      expect(result).toEqual(locationAutocomplete.name);

      locationAutocomplete = <LocalityMapAutocomplete>{};
      result = component.getSearchLocationAutocompleteText(locationAutocomplete);
      expect(result).toBeUndefined();
    });
  });

  describe('#initSearchLocationFilteredOptions', () => {

    it('should exists', () => {
      expect(component.initSearchLocationFilteredOptions).toBeTruthy();
      expect(component.initSearchLocationFilteredOptions).toEqual(jasmine.any(Function));
    });

    it('should works filter length > 3', fakeAsync(() => {
      spyOn(component, 'loadAutocompleteSearchOptions');

      component.initSearchLocationFilteredOptions();

      component.filterForm.controls.searchFilter.setValue('regio', { emitEvent: true });

      tick(2000);

      expect(component.loadAutocompleteSearchOptions).toHaveBeenCalled();
    }));

    it('should works filter length < 3', fakeAsync(() => {
      spyOn(component, 'loadAutocompleteSearchOptions');

      component.initSearchLocationFilteredOptions();

      component.filterForm.controls.searchFilter.setValue('re', { emitEvent: true });

      tick(2000);

      expect(component.loadingAutocomplete).toEqual(false);
    }));
  });

  describe('#loadAutocompleteSearchOptions', () => {
    it('should exists', () => {
      expect(component.loadAutocompleteSearchOptions).toBeTruthy();
      expect(component.loadAutocompleteSearchOptions).toEqual(jasmine.any(Function));
    });

    it('should works when server fail', () => {
      //@ts-ignore
      spyOn(component.alertService, 'showError');

      //@ts-ignore
      spyOn(component.localityMapService, 'getLocalityAutocompleteByCountry').and.returnValue(throwError({ message: 'http error' }));

      component.loadingAutocomplete = true;

      component.loadAutocompleteSearchOptions('region');

      //@ts-ignore
      expect(component.alertService.showError).toHaveBeenCalled();
      //@ts-ignore
      expect(component.alertService.showError).toHaveBeenCalledWith('Something went wrong with autocomplete api calls: http error');
      expect(component.loadingAutocomplete).toEqual(false);
    });

    it('should works when server success', () => {
      //@ts-ignore
      spyOn(component.localityMapService, 'getLocalityAutocompleteByCountry').and.returnValue(of(localitiesMapAutocompleteResponseFromServer));

      component.loadingAutocomplete = true;

      component.loadAutocompleteSearchOptions('region');

      //@ts-ignore
      expect(component.searchLocationFilteredOptions).toEqual(jasmine.any(Array));
      expect(component.searchLocationFilteredOptions.length).toEqual(localitiesMapAutocompleteResponseFromServer.length);
      expect(component.loadingAutocomplete).toEqual(false);
    });
  });

  describe('#onSelectLocationSearchOption', () => {

    it('should exists', () => {
      expect(component.onSelectLocationSearchOption).toBeTruthy();
      expect(component.onSelectLocationSearchOption).toEqual(jasmine.any(Function));
    });

    it('should works', async () => {
      // Creating spy
      spyOn(component, 'onSelectRegion');
      spyOn(component, 'onSelectState');
      spyOn(component, 'onSelectCity');

      // Initializing variables and setting properties values for test scenario
      const cityFromGeoJson = mockGeoJsonCities.features[0].properties;
      const region = new Region(cityFromGeoJson.region_code, cityFromGeoJson.region_name);
      const state = new State(cityFromGeoJson.state_code, cityFromGeoJson.state_name, region);
      const city = new City(cityFromGeoJson.municipality_code, cityFromGeoJson.municipality_name, state);

      let event = {
        option: {
          value: {}
        }
      } as MatAutocompleteSelectedEvent;

      // Test result expectations
      // Any selected location type
      await component.onSelectLocationSearchOption(event);
      expect(component.onSelectRegion).not.toHaveBeenCalled();
      expect(component.onSelectState).not.toHaveBeenCalled();
      expect(component.onSelectCity).not.toHaveBeenCalled();

      // Selected option type city
      event.option.value = <LocalityMapAutocomplete>{
        administrativeLevel: 'municipality',
        municipality: city
      }
      await component.onSelectLocationSearchOption(event);
      expect(component.onSelectRegion).toHaveBeenCalledWith(city.state.region, false);
      expect(component.onSelectState).toHaveBeenCalledWith(city.state, false);
      expect(component.onSelectCity).toHaveBeenCalledWith(city);

      // Selected option type state
      event.option.value = <LocalityMapAutocomplete>{
        administrativeLevel: 'state',
        state: state
      }
      await component.onSelectLocationSearchOption(event);
      expect(component.onSelectRegion).toHaveBeenCalledWith(state.region, false);
      expect(component.onSelectState).toHaveBeenCalledWith(state);

      // Selected option type region
      event.option.value = <LocalityMapAutocomplete>{
        administrativeLevel: 'region',
        region: region
      }
      await component.onSelectLocationSearchOption(event);
      expect(component.onSelectRegion).toHaveBeenCalledWith(region);
    })
  });

  //#endregion
  ////////////////////////////////////////////

  //#region UTIL FUNCTIONS
  ////////////////////////////////////////////
  describe('#getConnectivityPredictionBarColor', () => {

    it('should exists', () => {
      expect(component.getConnectivityPredictionBarColor).toBeTruthy();
      expect(component.getConnectivityPredictionBarColor).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      const valueYes = 'Yes';
      const valueNo = 'No';
      const valueNA = 'NA';

      expect(component.getConnectivityPredictionBarColor(valueYes)).toEqual(component.schoolsPredictionColorScheme[valueYes]);
      expect(component.getConnectivityPredictionBarColor(valueNo)).toEqual(component.schoolsPredictionColorScheme[valueNo]);
      expect(component.getConnectivityPredictionBarColor(valueNA)).toEqual(component.schoolsPredictionColorScheme[valueNA]);
    });
  });

  describe('#getLocalityStatisticsByMunicipalityCode', () => {

    it('should exists', () => {
      expect(component.getLocalityStatisticsByMunicipalityCode).toBeTruthy();
      expect(component.getLocalityStatisticsByMunicipalityCode).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      component.localityStatistics = localityStatisticsMunicipalities;

      const localityStatistics = localityStatisticsMunicipalities[0];

      const result = component.getLocalityStatisticsByMunicipalityCode(localityStatistics.localityMap.municipalityCode.toString());

      expect(result).toEqual(localityStatistics);
    })
  });

  describe('#getLocalityStatisticsByRegionCode', () => {

    it('should exists', () => {
      expect(component.getLocalityStatisticsByRegionCode).toBeTruthy();
      expect(component.getLocalityStatisticsByRegionCode).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      component.localityStatistics = localityStatisticsRegions;

      const localityStatistics = localityStatisticsRegions[0];

      const result = component.getLocalityStatisticsByRegionCode(localityStatistics.localityMap.regionCode.toString());

      expect(result).toEqual(localityStatistics);
    })
  });

  describe('#getLocalityStatisticsByStateCode', () => {

    it('should exists', () => {
      expect(component.getLocalityStatisticsByStateCode).toBeTruthy();
      expect(component.getLocalityStatisticsByStateCode).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      component.localityStatistics = localityStatisticsStates;

      const localityStatistics = localityStatisticsStates[0];

      const result = component.getLocalityStatisticsByStateCode(localityStatistics.localityMap.stateCode.toString());

      expect(result).toEqual(localityStatistics);
    })
  });

  describe('#getPercentageValueForFillColor', () => {

    it('should exists', () => {
      expect(component.getPercentageValueForFillColor).toBeTruthy();
      expect(component.getPercentageValueForFillColor).toEqual(jasmine.any(Function));
    });

    it('should works for connectivity view', () => {
      const viewOption = component.mapFilter.viewOptions.find(x => x.value === 'Connectivity');
      if (viewOption) {
        component.filterForm.controls['selectedViewOption'].setValue(viewOption);
        const stats = <LocalityStatistics>{
          schoolInternetAvailabilityPredicitionPercentage: 50,
          schoolInternetAvailabilityCount: 80
        };

        const result = component.getPercentageValueForFillColor(stats)

        expect(result).toEqual(stats.schoolInternetAvailabilityPercentage);
      }
    });

    it('should works for connectivity prediction view', () => {
      const viewOption = component.mapFilter.viewOptions.find(x => x.value === 'Prediction');
      if (viewOption) {
        component.filterForm.controls['selectedViewOption'].setValue(viewOption);
        const stats = <LocalityStatistics>{
          schoolInternetAvailabilityPredicitionPercentage: 50,
          schoolInternetAvailabilityPercentage: 80
        };

        const result = component.getPercentageValueForFillColor(stats)

        expect(result).toEqual(stats.schoolInternetAvailabilityPredicitionPercentage);
      }
    });
  });

  describe('#getRangeColorIndex', () => {

    it('should exists', () => {
      expect(component.getRangeColorIndex).toBeTruthy();
      expect(component.getRangeColorIndex).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      const rangeColors = component.getSelectedViewOption.rangeColors;

      // Testing for all range colors values
      rangeColors.forEach((color, index) => {
        expect(component.getRangeColorIndex(color.min)).toEqual(index);
        expect(component.getRangeColorIndex(color.max)).toEqual(index);
      });
    })
  });

  describe('#getRangeColorTooltipMessage', () => {

    it('should exists', () => {
      expect(component.getRangeColorTooltipMessage).toBeTruthy();
      expect(component.getRangeColorTooltipMessage).toEqual(jasmine.any(Function));
    });

    it('should works for connectivity view', () => {
      const viewOption = component.mapFilter.viewOptions.find(x => x.value === 'Connectivity');
      if (viewOption) {
        component.filterForm.controls['selectedViewOption'].setValue(viewOption);
        const tooltipMessage = component.getRangeColorTooltipMessage(0);

        expect(tooltipMessage).toEqual(`Between ${viewOption.rangeColors[0].min} and ${viewOption.rangeColors[0].max} percent of schools connected`);
      }
    });

    it('should works for connectivity prediction view', () => {
      const viewOption = component.mapFilter.viewOptions.find(x => x.value === 'Prediction');
      if (viewOption) {
        component.filterForm.controls['selectedViewOption'].setValue(viewOption);

        const tooltipMessage = component.getRangeColorTooltipMessage(0);

        expect(tooltipMessage).toEqual(`Between ${viewOption.rangeColors[0].min} and ${viewOption.rangeColors[0].max} percent of connectivity prediction`);
      }
    });
  });

  describe('#toggleFilterSettingsExpanded', () => {

    it('should exists', () => {
      expect(component.toggleFilterSettingsExpanded).toBeTruthy();
      expect(component.toggleFilterSettingsExpanded).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      component.filterSettingsExpanded = false;

      component.toggleFilterSettingsExpanded(true);

      expect(component.filterSettingsExpanded).toBeTrue();
    })
  });
  //#endregion
  ////////////////////////////////////////////
});
